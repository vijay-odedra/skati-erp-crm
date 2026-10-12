import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type { BomItem, AddBomItemInput, BomStatus } from './productTypes.ts';
import type { RawMaterial } from '../inventory/inventoryTypes.ts';

const BOM_COLLECTION = 'bomItems';
const RAW_MATERIALS_COLLECTION = 'rawMaterials';
const PRODUCTS_COLLECTION = 'products';

/**
 * Returns all active (or all) BOM items for a specific product.
 */
export async function getBomItems(
  productId: string,
  includeInactive = false
): Promise<BomItem[]> {
  const constraints = [where('productId', '==', productId)];
  if (!includeInactive) {
    constraints.push(where('isActive', '==', true));
  }

  const q = query(collection(db, BOM_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as BomItem[];
}

/**
 * Checks if a product has at least one active BOM item.
 */
export async function hasActiveBomItems(productId: string): Promise<boolean> {
  const q = query(
    collection(db, BOM_COLLECTION),
    where('productId', '==', productId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Adds a raw material to a product's BOM.
 * Uses atomic transaction and deterministic document ID (productId_rawMaterialId)
 * to guarantee no duplicate active raw materials exist for the same product.
 */
export async function addBomItem(
  productId: string,
  input: AddBomItemInput,
  userIdentifier: string
): Promise<BomItem> {
  const quantity = Number(input.quantityPerProduct);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity per product must be greater than zero.');
  }

  const rawMaterialId = input.rawMaterialId?.trim();
  if (!rawMaterialId) {
    throw new Error('Raw material selection is required.');
  }

  const rawMaterialRef = doc(db, RAW_MATERIALS_COLLECTION, rawMaterialId);
  const productRef = doc(db, PRODUCTS_COLLECTION, productId);
  const bomItemDocId = `${productId}_${rawMaterialId}`;
  const bomItemRef = doc(db, BOM_COLLECTION, bomItemDocId);

  return runTransaction(db, async (transaction) => {
    // 1. Verify product exists
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('Product not found.');
    }

    // 2. Verify raw material exists and is active
    const rawMaterialSnap = await transaction.get(rawMaterialRef);
    if (!rawMaterialSnap.exists()) {
      throw new Error('Raw material not found.');
    }
    const rawMaterial = rawMaterialSnap.data() as RawMaterial;
    if (!rawMaterial.isActive) {
      throw new Error(
        `Raw material "${rawMaterial.name}" is inactive and cannot be added to a new BOM.`
      );
    }

    // 3. Unit validation: piece must be whole integer
    if (rawMaterial.unit === 'piece' && !Number.isInteger(quantity)) {
      throw new Error(
        `Quantity for unit "Piece" must be a whole integer number. Received: ${quantity}`
      );
    }

    // 4. Duplicate protection check
    const existingBomSnap = await transaction.get(bomItemRef);
    const isNew = !existingBomSnap.exists();
    if (existingBomSnap.exists() && existingBomSnap.data().isActive) {
      throw new Error(
        `Raw material "${rawMaterial.name}" (${rawMaterial.materialCode}) is already part of this BOM. Edit the existing item to change its quantity.`
      );
    }

    // 5. Prepare document
    const bomData = {
      productId,
      rawMaterialId,
      materialCodeSnapshot: rawMaterial.materialCode,
      materialNameSnapshot: rawMaterial.name,
      unitSnapshot: rawMaterial.unit,
      quantityPerProduct: quantity,
      isActive: true,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
      ...(isNew
        ? {
            createdAt: serverTimestamp(),
            createdBy: userIdentifier,
          }
        : {}),
    };

    transaction.set(bomItemRef, bomData, { merge: true });

    return {
      id: bomItemDocId,
      productId,
      rawMaterialId,
      materialCodeSnapshot: rawMaterial.materialCode,
      materialNameSnapshot: rawMaterial.name,
      unitSnapshot: rawMaterial.unit,
      quantityPerProduct: quantity,
      isActive: true,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    } as BomItem;
  });
}

/**
 * Updates the required quantity for an existing BOM item.
 */
export async function updateBomItemQuantity(
  bomItemId: string,
  quantityPerProduct: number,
  userIdentifier: string
): Promise<void> {
  const quantity = Number(quantityPerProduct);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity per product must be greater than zero.');
  }

  const bomItemRef = doc(db, BOM_COLLECTION, bomItemId);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(bomItemRef);
    if (!docSnap.exists()) {
      throw new Error('BOM item not found.');
    }

    const data = docSnap.data() as BomItem;
    if (data.unitSnapshot === 'piece' && !Number.isInteger(quantity)) {
      throw new Error('Quantity for unit "Piece" must be a whole integer number.');
    }

    transaction.update(bomItemRef, {
      quantityPerProduct: quantity,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });
  });
}

/**
 * Deactivates a BOM item (soft removal) to protect historical audit integrity.
 */
export async function deactivateBomItem(
  bomItemId: string,
  userIdentifier: string
): Promise<void> {
  const bomItemRef = doc(db, BOM_COLLECTION, bomItemId);
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(bomItemRef);
    if (!docSnap.exists()) {
      throw new Error('BOM item not found.');
    }

    transaction.update(bomItemRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });
  });
}

/**
 * Derives BOM status map for a list of product IDs.
 */
export async function getProductBomStatusMap(
  productIds: string[]
): Promise<Record<string, BomStatus>> {
  const statusMap: Record<string, BomStatus> = {};
  for (const id of productIds) {
    statusMap[id] = 'NO_BOM';
  }

  if (productIds.length === 0) return statusMap;

  // Query active BOM items matching these product IDs
  // For safety with large arrays, query in chunks of 30 if needed
  const chunkSize = 30;
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const chunk = productIds.slice(i, i + chunkSize);
    const q = query(
      collection(db, BOM_COLLECTION),
      where('productId', 'in', chunk),
      where('isActive', '==', true)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data() as BomItem;
      statusMap[data.productId] = 'COMPLETE';
    });
  }

  return statusMap;
}
