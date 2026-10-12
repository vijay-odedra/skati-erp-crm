import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  CreatePurchaseInput,
  Purchase,
} from './purchaseTypes.ts';
import type { Supplier } from './purchaseTypes.ts';
import type { RawMaterial } from '../inventory/inventoryTypes.ts';

const PURCHASES_COLLECTION = 'purchases';
const PURCHASE_ITEMS_COLLECTION = 'purchaseItems';
const SUPPLIERS_COLLECTION = 'suppliers';
const RAW_MATERIALS_COLLECTION = 'rawMaterials';
const STOCK_TRANSACTIONS_COLLECTION = 'stockTransactions';
const COUNTERS_COLLECTION = 'counters';
const PURCHASE_COUNTER_ID = 'purchases';

/**
 * Executes an atomic purchase inward in ONE single Firestore transaction:
 * - Validates supplier and active raw materials
 * - Prevents duplicate items in the same purchase batch
 * - Calculates line subtotals, GST taxes, and grand totals accurately
 * - Increments raw materials stock balances
 * - Creates immutable PURCHASE stock transaction audit records
 * - Creates immutable purchaseItems records
 * - Creates master purchase record (status: RECEIVED)
 * - 100% rollback on any validation failure
 */
export async function executePurchaseInward(
  input: CreatePurchaseInput,
  userIdentifier: string
): Promise<Purchase> {
  const supplierId = input.supplierId?.trim();
  if (!supplierId) {
    throw new Error('Supplier selection is required.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('Purchase must contain at least one item.');
  }

  // Check duplicate raw materials in input batch
  const materialIds = input.items.map((it) => it.rawMaterialId.trim());
  const uniqueMaterialIds = new Set(materialIds);
  if (uniqueMaterialIds.size !== materialIds.length) {
    throw new Error(
      'Duplicate raw materials detected in purchase order. Combine quantities into a single line item.'
    );
  }

  // Pre-validate item quantities and prices
  for (const it of input.items) {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Item quantity must be a positive number greater than zero.');
    }
    if (isNaN(price) || price < 0) {
      throw new Error('Item unit price must be a valid non-negative number.');
    }
  }

  const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplierId);
  const counterRef = doc(db, COUNTERS_COLLECTION, PURCHASE_COUNTER_ID);
  const purchaseRef = doc(collection(db, PURCHASES_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. READ & VALIDATE SUPPLIER
    const supplierSnap = await transaction.get(supplierRef);
    if (!supplierSnap.exists()) {
      throw new Error('Selected supplier not found.');
    }
    const supplier = supplierSnap.data() as Supplier;
    if (!supplier.isActive) {
      throw new Error(`Supplier "${supplier.name}" is inactive.`);
    }

    // 2. READ & VALIDATE COUNTER
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const purchaseCode = `PUR-${String(nextCount).padStart(6, '0')}`;

    // 3. READ & VALIDATE ALL RAW MATERIALS
    const processedItems: {
      rawMatRef: ReturnType<typeof doc>;
      rawMaterial: RawMaterial;
      quantity: number;
      unitPrice: number;
      lineSubtotal: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
    }[] = [];

    let subtotal = 0;
    let totalTax = 0;

    for (const itemInput of input.items) {
      const rawMatRef = doc(db, RAW_MATERIALS_COLLECTION, itemInput.rawMaterialId.trim());
      const rawMatSnap = await transaction.get(rawMatRef);

      if (!rawMatSnap.exists()) {
        throw new Error(`Raw material with ID "${itemInput.rawMaterialId}" not found.`);
      }

      const rawMaterial = rawMatSnap.data() as RawMaterial;
      if (!rawMaterial.isActive) {
        throw new Error(`Raw material "${rawMaterial.name}" (${rawMaterial.materialCode}) is inactive.`);
      }

      const quantity = Number(itemInput.quantity);
      if (rawMaterial.unit === 'piece' && !Number.isInteger(quantity)) {
        throw new Error(
          `Raw material "${rawMaterial.name}" with unit "Piece" requires a whole integer quantity.`
        );
      }

      const unitPrice = Number(itemInput.unitPrice);
      const taxRate = Number(itemInput.taxRate || 0);

      const lineSubtotal = Number((quantity * unitPrice).toFixed(2));
      const taxAmount = Number((lineSubtotal * (taxRate / 100)).toFixed(2));
      const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

      subtotal = Number((subtotal + lineSubtotal).toFixed(2));
      totalTax = Number((totalTax + taxAmount).toFixed(2));

      processedItems.push({
        rawMatRef,
        rawMaterial,
        quantity,
        unitPrice,
        lineSubtotal,
        taxRate,
        taxAmount,
        lineTotal,
      });
    }

    const discountAmount = Number((input.discountAmount || 0).toFixed(2));
    const grandTotal = Number((subtotal + totalTax - discountAmount).toFixed(2));

    // ==========================================
    // ALL READS & CALCULATIONS COMPLETE. WRITES:
    // ==========================================

    // 4. UPDATE RAW MATERIAL STOCK & WRITE PURCHASE STOCK TRANSACTIONS & PURCHASE ITEMS
    for (const item of processedItems) {
      const newStock = Number((item.rawMaterial.currentStock + item.quantity).toFixed(4));

      transaction.update(item.rawMatRef, {
        currentStock: newStock,
        updatedAt: serverTimestamp(),
        updatedBy: userIdentifier,
      });

      const stockTxRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));
      transaction.set(stockTxRef, {
        rawMaterialId: item.rawMaterial.id,
        rawMaterialNameSnapshot: item.rawMaterial.name,
        type: 'PURCHASE',
        quantity: item.quantity,
        unit: item.rawMaterial.unit,
        referenceType: 'PURCHASE_ORDER',
        referenceId: purchaseRef.id,
        reason: `Purchase order ${purchaseCode} from ${supplier.name}`,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });

      const purchaseItemRef = doc(collection(db, PURCHASE_ITEMS_COLLECTION));
      transaction.set(purchaseItemRef, {
        purchaseId: purchaseRef.id,
        rawMaterialId: item.rawMaterial.id,
        materialCodeSnapshot: item.rawMaterial.materialCode,
        materialNameSnapshot: item.rawMaterial.name,
        unit: item.rawMaterial.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineSubtotal: item.lineSubtotal,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        lineTotal: item.lineTotal,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });
    }

    // 5. UPDATE SEQUENTIAL COUNTER
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    // 6. CREATE MASTER PURCHASE RECORD
    const purchaseData = {
      purchaseCode,
      supplierId,
      supplierCodeSnapshot: supplier.supplierCode,
      supplierNameSnapshot: supplier.name,
      purchaseDate: input.purchaseDate ? input.purchaseDate : serverTimestamp(),
      invoiceNumber: input.invoiceNumber?.trim() || '',
      status: 'RECEIVED' as const,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      grandTotal,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(purchaseRef, purchaseData);

    return {
      id: purchaseRef.id,
      ...purchaseData,
      purchaseDate: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Purchase;
  });
}
