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
import type {
  CreateProductionInput,
  Production,
  ProductionPreviewResult,
  ProductionMaterialRequirement,
} from './productionTypes.ts';
import type { Product, BomItem } from '../products/productTypes.ts';
import type { RawMaterial } from '../inventory/inventoryTypes.ts';
import { getProduct } from '../products/products.ts';
import { getBomItems } from '../products/bom.ts';
import { getRawMaterial } from '../inventory/rawMaterials.ts';
import { PRODUCTION_AREAS } from '../../constants/production.ts';

const PRODUCTIONS_COLLECTION = 'productions';
const PRODUCTION_ITEMS_COLLECTION = 'productionItems';
const FINISHED_STOCK_COLLECTION = 'finishedProductStock';
const FINISHED_TX_COLLECTION = 'finishedProductTransactions';
const RAW_MATERIALS_COLLECTION = 'rawMaterials';
const STOCK_TRANSACTIONS_COLLECTION = 'stockTransactions';
const COUNTERS_COLLECTION = 'counters';
const PRODUCTION_COUNTER_ID = 'productions';

/**
 * Calculates raw material requirements and compares with live inventory for pre-submission preview.
 */
export async function previewProduction(
  productId: string,
  quantityProduced: number,
  productionArea: CreateProductionInput['productionArea']
): Promise<ProductionPreviewResult> {
  const quantity = Number(quantityProduced);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Production quantity must be a positive number greater than zero.');
  }

  const product = await getProduct(productId);
  if (!product) {
    throw new Error('Selected product not found.');
  }
  if (!product.isActive) {
    throw new Error(`Product "${product.name}" is inactive.`);
  }

  if (product.unit === 'piece' && !Number.isInteger(quantity)) {
    throw new Error(`Production quantity for unit "Piece" must be a whole integer number.`);
  }

  const bomItems = await getBomItems(productId, false);
  if (bomItems.length === 0) {
    throw new Error(
      `Product "${product.name}" (${product.productCode}) has no active Bill of Materials (BOM) configured.`
    );
  }

  let isAllStockSufficient = true;
  const materials: ProductionMaterialRequirement[] = [];

  for (const item of bomItems) {
    const rawMat = await getRawMaterial(item.rawMaterialId);
    if (!rawMat) {
      throw new Error(`Raw material component "${item.materialNameSnapshot}" not found.`);
    }

    const requiredQuantity = Number((item.quantityPerProduct * quantity).toFixed(4));
    const availableStock = rawMat.currentStock;
    const isSufficient = rawMat.isActive && availableStock >= requiredQuantity;
    const shortageQuantity = isSufficient ? 0 : Math.max(0, requiredQuantity - availableStock);

    if (!isSufficient) {
      isAllStockSufficient = false;
    }

    materials.push({
      rawMaterialId: item.rawMaterialId,
      materialCode: rawMat.materialCode,
      materialName: rawMat.name,
      unit: rawMat.unit,
      quantityPerProduct: item.quantityPerProduct,
      requiredQuantity,
      availableStock,
      isSufficient,
      shortageQuantity,
    });
  }

  return {
    product: {
      id: product.id,
      productCode: product.productCode,
      name: product.name,
      unit: product.unit,
    },
    quantityProduced: quantity,
    productionArea,
    materials,
    isAllStockSufficient,
  };
}

/**
 * Executes an atomic multi-material production batch in ONE Firestore transaction:
 * - Checks & locks product, BOM, and all raw materials
 * - Verifies non-negativity and stock sufficiency
 * - Decrements all raw materials & writes stockTransactions (USAGE)
 * - Writes immutable productionItems snapshots
 * - Increases finished goods stock & writes finishedProductTransactions (PRODUCTION_IN)
 * - Creates production record (COMPLETED) with sequential PROD-XXXXXX code
 * - Rolls back completely on any failure
 */
export async function executeProductionBatch(
  input: CreateProductionInput,
  userIdentifier: string
): Promise<Production> {
  const quantityProduced = Number(input.quantityProduced);
  if (isNaN(quantityProduced) || quantityProduced <= 0) {
    throw new Error('Production quantity must be a positive number greater than zero.');
  }

  if (!PRODUCTION_AREAS.some((a) => a.value === input.productionArea)) {
    throw new Error('Valid production area is required.');
  }

  const productId = input.productId?.trim();
  if (!productId) {
    throw new Error('Product selection is required.');
  }

  // Pre-fetch active BOM items list
  const bomItemsQuery = query(
    collection(db, 'bomItems'),
    where('productId', '==', productId),
    where('isActive', '==', true)
  );
  const bomSnapshots = await getDocs(bomItemsQuery);
  if (bomSnapshots.empty) {
    throw new Error('Cannot execute production: Product has no active Bill of Materials (BOM).');
  }

  const activeBomItems = bomSnapshots.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as BomItem[];

  // Document references
  const productRef = doc(db, 'products', productId);
  const counterRef = doc(db, COUNTERS_COLLECTION, PRODUCTION_COUNTER_ID);
  const productionRef = doc(collection(db, PRODUCTIONS_COLLECTION));
  const finishedStockRef = doc(db, FINISHED_STOCK_COLLECTION, productId);
  const finishedTxRef = doc(collection(db, FINISHED_TX_COLLECTION));
  const orderRef = input.orderId?.trim() ? doc(db, 'orders', input.orderId.trim()) : null;
  const orderItemRef = input.orderItemId?.trim() ? doc(db, 'orderItems', input.orderItemId.trim()) : null;

  return runTransaction(db, async (transaction) => {
    // 1. READ & VALIDATE PRODUCT
    const productSnap = await transaction.get(productRef);
    if (!productSnap.exists()) {
      throw new Error('Product not found.');
    }
    const product = productSnap.data() as Product;
    if (!product.isActive) {
      throw new Error(`Product "${product.name}" is inactive.`);
    }
    if (product.unit === 'piece' && !Number.isInteger(quantityProduced)) {
      throw new Error('Production quantity for unit "Piece" must be a whole integer number.');
    }

    // 1b. OPTIONAL READ & VALIDATE ORDER LINK
    let linkedOrderData: Record<string, unknown> | null = null;
    let linkedOrderItemData: Record<string, unknown> | null = null;
    if (orderRef && orderItemRef) {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Linked Sales Order "${input.orderId}" not found.`);
      }
      linkedOrderData = orderSnap.data();
      if (linkedOrderData.status === 'CANCELLED') {
        throw new Error('Cannot allocate production against a cancelled order.');
      }

      const orderItemSnap = await transaction.get(orderItemRef);
      if (!orderItemSnap.exists()) {
        throw new Error(`Linked Order Item "${input.orderItemId}" not found.`);
      }
      linkedOrderItemData = orderItemSnap.data();
      if (linkedOrderItemData.productId !== productId) {
        throw new Error('Linked order item product does not match production product.');
      }
    }

    // 2. READ COUNTER FOR PRODUCTION CODE
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const productionCode = `PROD-${String(nextCount).padStart(6, '0')}`;

    // 3. READ & VALIDATE ALL REQUIRED RAW MATERIALS
    const rawMaterialUpdates: {
      ref: ReturnType<typeof doc>;
      rawMaterial: RawMaterial;
      requiredQuantity: number;
      bomItem: BomItem;
      newStock: number;
    }[] = [];

    for (const bomItem of activeBomItems) {
      const rawMatRef = doc(db, RAW_MATERIALS_COLLECTION, bomItem.rawMaterialId);
      const rawMatSnap = await transaction.get(rawMatRef);

      if (!rawMatSnap.exists()) {
        throw new Error(
          `Raw material "${bomItem.materialNameSnapshot}" (${bomItem.materialCodeSnapshot}) not found in inventory.`
        );
      }

      const rawMat = rawMatSnap.data() as RawMaterial;
      if (!rawMat.isActive) {
        throw new Error(
          `Raw material "${rawMat.name}" (${rawMat.materialCode}) is currently inactive.`
        );
      }

      if (rawMat.unit !== bomItem.unitSnapshot) {
        throw new Error(
          `Unit mismatch on "${rawMat.name}": Master unit "${rawMat.unit}" vs BOM unit "${bomItem.unitSnapshot}".`
        );
      }

      const requiredQuantity = Number(
        (bomItem.quantityPerProduct * quantityProduced).toFixed(4)
      );

      if (rawMat.unit === 'piece' && !Number.isInteger(requiredQuantity)) {
        throw new Error(
          `Piece raw material "${rawMat.name}" calculated fractional requirement (${requiredQuantity}). Whole numbers required.`
        );
      }

      if (rawMat.currentStock < requiredQuantity) {
        throw new Error(
          `Insufficient stock for "${rawMat.name}" (${rawMat.materialCode}). Required: ${requiredQuantity} ${rawMat.unit}, Available: ${rawMat.currentStock} ${rawMat.unit} (Shortage: ${(requiredQuantity - rawMat.currentStock).toFixed(2)} ${rawMat.unit}).`
        );
      }

      const newStock = Number((rawMat.currentStock - requiredQuantity).toFixed(4));
      if (newStock < 0) {
        throw new Error(`Stock for "${rawMat.name}" cannot become negative.`);
      }

      rawMaterialUpdates.push({
        ref: rawMatRef,
        rawMaterial: rawMat,
        requiredQuantity,
        bomItem,
        newStock,
      });
    }

    // 4. READ FINISHED PRODUCT STOCK
    const finishedStockSnap = await transaction.get(finishedStockRef);
    let currentFinishedStock = 0;
    if (finishedStockSnap.exists()) {
      currentFinishedStock = finishedStockSnap.data().currentStock || 0;
    }
    const newFinishedStock = Number((currentFinishedStock + quantityProduced).toFixed(4));

    // ==========================================
    // ALL READS COMPLETED. PROCEED WITH WRITES.
    // ==========================================

    // 5. UPDATE RAW MATERIAL STOCK BALANCES & CREATE STOCK USAGE AUDIT TRANSACTIONS
    for (const update of rawMaterialUpdates) {
      transaction.update(update.ref, {
        currentStock: update.newStock,
        updatedAt: serverTimestamp(),
        updatedBy: userIdentifier,
      });

      const usageTxRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));
      transaction.set(usageTxRef, {
        rawMaterialId: update.bomItem.rawMaterialId,
        rawMaterialNameSnapshot: update.rawMaterial.name,
        type: 'USAGE',
        quantity: update.requiredQuantity,
        unit: update.rawMaterial.unit,
        referenceType: 'PRODUCTION_BATCH',
        referenceId: productionRef.id,
        reason: `Production batch ${productionCode} (${quantityProduced} ${product.unit} of ${product.name})`,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });

      // 6. CREATE IMMUTABLE BOM CONSUMPTION SNAPSHOT (productionItems)
      const prodItemRef = doc(collection(db, PRODUCTION_ITEMS_COLLECTION));
      transaction.set(prodItemRef, {
        productionId: productionRef.id,
        rawMaterialId: update.bomItem.rawMaterialId,
        materialCodeSnapshot: update.bomItem.materialCodeSnapshot,
        materialNameSnapshot: update.bomItem.materialNameSnapshot,
        unit: update.rawMaterial.unit,
        quantityPerProduct: update.bomItem.quantityPerProduct,
        quantityConsumed: update.requiredQuantity,
        createdAt: serverTimestamp(),
      });
    }

    // 7. UPDATE / CREATE FINISHED PRODUCT STOCK
    transaction.set(
      finishedStockRef,
      {
        productId,
        productCodeSnapshot: product.productCode,
        productNameSnapshot: product.name,
        unit: product.unit,
        currentStock: newFinishedStock,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 8. CREATE FINISHED PRODUCT INWARD TRANSACTION
    transaction.set(finishedTxRef, {
      productId,
      productCodeSnapshot: product.productCode,
      productNameSnapshot: product.name,
      type: 'PRODUCTION_IN',
      quantity: quantityProduced,
      unit: product.unit,
      referenceType: 'PRODUCTION_BATCH',
      referenceId: productionRef.id,
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
    });

    // 9. UPDATE PRODUCTION SEQUENTIAL COUNTER
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    // 10. CREATE PRODUCTION MASTER RECORD
    const productionData = {
      productionCode,
      productId,
      productCodeSnapshot: product.productCode,
      productNameSnapshot: product.name,
      productUnitSnapshot: product.unit,
      productionArea: input.productionArea,
      quantityProduced,
      status: 'COMPLETED' as const,
      notes: input.notes?.trim() || '',
      startedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    transaction.set(productionRef, productionData);

    // 11. OPTIONAL ORDER FULFILLMENT WRITE
    if (orderRef && orderItemRef && linkedOrderItemData && linkedOrderData) {
      const currentProduced = (linkedOrderItemData.producedQuantity as number) || 0;
      const orderedQty = (linkedOrderItemData.orderedQuantity as number) || 0;
      const newProduced = Number((currentProduced + quantityProduced).toFixed(4));
      const newPendingProduction = Math.max(0, Number((orderedQty - newProduced).toFixed(4)));

      transaction.update(orderItemRef, {
        producedQuantity: newProduced,
        pendingProductionQuantity: newPendingProduction,
        updatedAt: serverTimestamp(),
        updatedBy: userIdentifier,
      });

      // Update order status if appropriate
      if (['DRAFT', 'CONFIRMED'].includes(linkedOrderData.status as string)) {
        transaction.update(orderRef, {
          status: 'IN_PRODUCTION',
          updatedAt: serverTimestamp(),
          updatedBy: userIdentifier,
        });
      }

      // Record production-order link
      const linkRef = doc(collection(db, 'productionOrderLinks'));
      transaction.set(linkRef, {
        productionId: productionRef.id,
        productionCodeSnapshot: productionCode,
        orderId: input.orderId?.trim(),
        orderCodeSnapshot: linkedOrderData.orderCode as string,
        orderItemId: input.orderItemId?.trim(),
        productId,
        productCodeSnapshot: product.productCode,
        productNameSnapshot: product.name,
        quantityAllocated: quantityProduced,
        unit: product.unit,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });
    }

    return {
      id: productionRef.id,
      ...productionData,
      startedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      completedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Production;
  });
}
