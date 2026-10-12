import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  StockTransaction,
  RecordUsageInput,
  RecordAdjustmentInput,
  RecordPurchaseInput,
} from './inventoryTypes.ts';

const RAW_MATERIALS_COLLECTION = 'rawMaterials';
const STOCK_TRANSACTIONS_COLLECTION = 'stockTransactions';

/**
 * Records a stock usage/deduction operation atomically.
 * Ensures stock never drops below zero even with concurrent updates.
 */
export async function recordStockUsage(
  input: RecordUsageInput,
  userIdentifier: string
): Promise<StockTransaction> {
  const quantity = Number(input.quantity);
  if (!quantity || quantity <= 0) {
    throw new Error('Usage quantity must be greater than zero.');
  }

  const materialRef = doc(db, RAW_MATERIALS_COLLECTION, input.rawMaterialId);
  const txRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const materialSnap = await transaction.get(materialRef);
    if (!materialSnap.exists()) {
      throw new Error('Raw material not found.');
    }

    const materialData = materialSnap.data();
    if (!materialData.isActive) {
      throw new Error('Cannot record stock usage for a deactivated raw material.');
    }

    // Piece units must be whole integers
    if (materialData.unit === 'piece' && !Number.isInteger(quantity)) {
      throw new Error('Usage quantity for unit "Piece" must be a whole integer number.');
    }

    const currentStock = Number(materialData.currentStock) || 0;
    if (currentStock < quantity) {
      throw new Error(
        `Insufficient stock available. Current stock is ${currentStock} ${materialData.unit}, requested ${quantity} ${materialData.unit}.`
      );
    }

    const newStock = currentStock - quantity;

    // 1. Update raw material balance
    transaction.update(materialRef, {
      currentStock: newStock,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    // 2. Create audit stock transaction
    const txData = {
      rawMaterialId: input.rawMaterialId,
      rawMaterialNameSnapshot: materialData.name,
      type: 'USAGE' as const,
      quantity,
      unit: materialData.unit,
      referenceType: 'MANUAL_USAGE' as const,
      referenceId: input.referenceId?.trim() || '',
      reason: input.reason?.trim() || 'Production or shop floor usage',
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
    };

    transaction.set(txRef, txData);

    return {
      id: txRef.id,
      ...txData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as StockTransaction;
  });
}

/**
 * Records a controlled stock adjustment (IN or OUT) with mandatory reason.
 * Restricted to authorized managerial / administrative personnel.
 */
export async function recordStockAdjustment(
  input: RecordAdjustmentInput,
  userIdentifier: string
): Promise<StockTransaction> {
  const quantity = Number(input.quantity);
  if (!quantity || quantity <= 0) {
    throw new Error('Adjustment quantity must be greater than zero.');
  }

  const reason = input.reason?.trim();
  if (!reason) {
    throw new Error('A valid reason is required for all stock adjustments.');
  }

  if (input.type !== 'ADJUSTMENT_IN' && input.type !== 'ADJUSTMENT_OUT') {
    throw new Error('Invalid adjustment type.');
  }

  const materialRef = doc(db, RAW_MATERIALS_COLLECTION, input.rawMaterialId);
  const txRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const materialSnap = await transaction.get(materialRef);
    if (!materialSnap.exists()) {
      throw new Error('Raw material not found.');
    }

    const materialData = materialSnap.data();

    // Piece units must be whole integers
    if (materialData.unit === 'piece' && !Number.isInteger(quantity)) {
      throw new Error('Adjustment quantity for unit "Piece" must be a whole integer number.');
    }

    const currentStock = Number(materialData.currentStock) || 0;

    let newStock: number;
    if (input.type === 'ADJUSTMENT_IN') {
      newStock = currentStock + quantity;
    } else {
      if (currentStock < quantity) {
        throw new Error(
          `Insufficient stock for adjustment deduction. Current stock is ${currentStock} ${materialData.unit}, adjustment deduction is ${quantity} ${materialData.unit}.`
        );
      }
      newStock = currentStock - quantity;
    }

    // 1. Update raw material balance
    transaction.update(materialRef, {
      currentStock: newStock,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    // 2. Create audit stock transaction
    const txData = {
      rawMaterialId: input.rawMaterialId,
      rawMaterialNameSnapshot: materialData.name,
      type: input.type,
      quantity,
      unit: materialData.unit,
      referenceType: 'STOCK_COUNT_ADJUSTMENT' as const,
      reason,
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
    };

    transaction.set(txRef, txData);

    return {
      id: txRef.id,
      ...txData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as StockTransaction;
  });
}

/**
 * Records a purchase stock inward operation atomically.
 */
export async function recordStockPurchase(
  input: RecordPurchaseInput,
  userIdentifier: string
): Promise<StockTransaction> {
  const quantity = Number(input.quantity);
  if (!quantity || quantity <= 0) {
    throw new Error('Purchase quantity must be greater than zero.');
  }

  const materialRef = doc(db, RAW_MATERIALS_COLLECTION, input.rawMaterialId);
  const txRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const materialSnap = await transaction.get(materialRef);
    if (!materialSnap.exists()) {
      throw new Error('Raw material not found.');
    }

    const materialData = materialSnap.data();

    // Piece units must be whole integers
    if (materialData.unit === 'piece' && !Number.isInteger(quantity)) {
      throw new Error('Purchase quantity for unit "Piece" must be a whole integer number.');
    }

    const currentStock = Number(materialData.currentStock) || 0;
    const newStock = currentStock + quantity;

    transaction.update(materialRef, {
      currentStock: newStock,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    const txData = {
      rawMaterialId: input.rawMaterialId,
      rawMaterialNameSnapshot: materialData.name,
      type: 'PURCHASE' as const,
      quantity,
      unit: materialData.unit,
      referenceType: 'PURCHASE_ORDER' as const,
      referenceId: input.referenceId?.trim() || '',
      reason: input.reason?.trim() || 'Purchase inward stock receipt',
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
    };

    transaction.set(txRef, txData);

    return {
      id: txRef.id,
      ...txData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as StockTransaction;
  });
}

/**
 * Fetches stock transaction history for a specific raw material.
 */
export async function getStockHistory(
  rawMaterialId: string,
  limitCount = 50
): Promise<StockTransaction[]> {
  const q = query(
    collection(db, STOCK_TRANSACTIONS_COLLECTION),
    where('rawMaterialId', '==', rawMaterialId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as StockTransaction[];
}
