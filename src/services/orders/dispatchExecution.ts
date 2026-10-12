import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Dispatch,
  CreateDispatchInput,
  Order,
  OrderItem,
  OrderStatus,
} from './orderTypes.ts';

const DISPATCHES_COLLECTION = 'dispatches';
const DISPATCH_ITEMS_COLLECTION = 'dispatchItems';
const ORDERS_COLLECTION = 'orders';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const FINISHED_STOCK_COLLECTION = 'finishedProductStock';
const FINISHED_TX_COLLECTION = 'finishedProductTransactions';
const COUNTERS_COLLECTION = 'counters';
const DISPATCH_COUNTER_ID = 'dispatches';

/**
 * Executes an atomic dispatch transaction:
 * 1. Validates order, items, and available finished stock
 * 2. Deducts finished product stock
 * 3. Records immutable finished-product audit transactions (DISPATCH_OUT)
 * 4. Creates dispatch & dispatch item records
 * 5. Updates order items dispatched quantities & order status
 */
export async function executeDispatch(
  input: CreateDispatchInput,
  userIdentifier: string
): Promise<Dispatch> {
  const orderId = input.orderId?.trim();
  if (!orderId) {
    throw new Error('Order ID is required for dispatch.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('At least one dispatch item is required.');
  }

  // Prevent duplicate order items within the same dispatch
  const orderItemIds = new Set<string>();
  for (const item of input.items) {
    const oItemId = item.orderItemId?.trim();
    if (!oItemId) {
      throw new Error('Order Item ID is required for all dispatch items.');
    }
    if (orderItemIds.has(oItemId)) {
      throw new Error('Duplicate order item lines are not allowed within the same dispatch.');
    }
    orderItemIds.add(oItemId);

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Dispatch quantity must be a positive number greater than zero.');
    }
  }

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const counterRef = doc(db, COUNTERS_COLLECTION, DISPATCH_COUNTER_ID);
  const dispatchRef = doc(collection(db, DISPATCHES_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. READ ORDER
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error(`Order with ID "${orderId}" does not exist.`);
    }

    const order = orderSnap.data() as Order;
    if (order.status === 'CANCELLED') {
      throw new Error('Cannot dispatch against a CANCELLED order.');
    }

    // 2. READ ALL ORDER ITEMS & FINISHED PRODUCT STOCK
    const validatedDispatchItems: {
      orderItemRef: ReturnType<typeof doc>;
      orderItem: OrderItem;
      finishedStockRef: ReturnType<typeof doc>;
      currentFinishedStock: number;
      newFinishedStock: number;
      dispatchQuantity: number;
      newDispatchedQuantity: number;
      newPendingDispatch: number;
    }[] = [];

    let totalDispatchQuantity = 0;

    for (const dItemInput of input.items) {
      const orderItemRef = doc(db, ORDER_ITEMS_COLLECTION, dItemInput.orderItemId.trim());
      const orderItemSnap = await transaction.get(orderItemRef);

      if (!orderItemSnap.exists()) {
        throw new Error(`Order item "${dItemInput.orderItemId}" not found.`);
      }

      const orderItem = orderItemSnap.data() as OrderItem;
      if (orderItem.orderId !== orderId) {
        throw new Error(`Order item "${orderItem.id}" does not belong to order "${orderId}".`);
      }

      const dispatchQty = Number(dItemInput.quantity);
      if (orderItem.unit === 'piece' && !Number.isInteger(dispatchQty)) {
        throw new Error(`Dispatch quantity for "${orderItem.productNameSnapshot}" (unit piece) must be a whole integer.`);
      }

      const pendingDispatch = orderItem.pendingDispatchQuantity !== undefined
        ? orderItem.pendingDispatchQuantity
        : Math.max(0, orderItem.orderedQuantity - (orderItem.dispatchedQuantity || 0));

      if (dispatchQty > pendingDispatch) {
        throw new Error(
          `Cannot dispatch ${dispatchQty} ${orderItem.unit} of "${orderItem.productNameSnapshot}". Maximum pending dispatch quantity is ${pendingDispatch} ${orderItem.unit}.`
        );
      }

      // Check finished product stock
      const finishedStockRef = doc(db, FINISHED_STOCK_COLLECTION, orderItem.productId);
      const finishedStockSnap = await transaction.get(finishedStockRef);

      let currentStock = 0;
      if (finishedStockSnap.exists()) {
        currentStock = finishedStockSnap.data().currentStock || 0;
      }

      if (currentStock < dispatchQty) {
        throw new Error(
          `Insufficient finished goods stock for "${orderItem.productNameSnapshot}" (${orderItem.productCodeSnapshot}). Required: ${dispatchQty} ${orderItem.unit}, Available in Stock: ${currentStock} ${orderItem.unit}.`
        );
      }

      const newFinishedStock = Number((currentStock - dispatchQty).toFixed(4));
      const newDispatched = Number(((orderItem.dispatchedQuantity || 0) + dispatchQty).toFixed(4));
      const newPending = Math.max(0, Number((orderItem.orderedQuantity - newDispatched).toFixed(4)));

      totalDispatchQuantity = Number((totalDispatchQuantity + dispatchQty).toFixed(4));

      validatedDispatchItems.push({
        orderItemRef,
        orderItem,
        finishedStockRef,
        currentFinishedStock: currentStock,
        newFinishedStock,
        dispatchQuantity: dispatchQty,
        newDispatchedQuantity: newDispatched,
        newPendingDispatch: newPending,
      });
    }

    // 3. READ COUNTER
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const dispatchCode = `DSP-${String(nextCount).padStart(6, '0')}`;

    // ==========================================
    // ALL READS COMPLETED. PROCEED WITH WRITES.
    // ==========================================

    // 4. DEDUCT FINISHED STOCK & RECORD AUDIT LEDGERS & UPDATE ORDER ITEMS
    let allItemsFullyDispatched = true;

    for (const vItem of validatedDispatchItems) {
      // 4a. Update Finished Product Stock
      transaction.set(
        vItem.finishedStockRef,
        {
          productId: vItem.orderItem.productId,
          productCodeSnapshot: vItem.orderItem.productCodeSnapshot,
          productNameSnapshot: vItem.orderItem.productNameSnapshot,
          unit: vItem.orderItem.unit,
          currentStock: vItem.newFinishedStock,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 4b. Record Immutable Outward Stock Transaction
      const finishedTxRef = doc(collection(db, FINISHED_TX_COLLECTION));
      transaction.set(finishedTxRef, {
        productId: vItem.orderItem.productId,
        productCodeSnapshot: vItem.orderItem.productCodeSnapshot,
        productNameSnapshot: vItem.orderItem.productNameSnapshot,
        type: 'DISPATCH_OUT',
        quantity: vItem.dispatchQuantity,
        unit: vItem.orderItem.unit,
        referenceType: 'DISPATCH',
        referenceId: dispatchRef.id,
        referenceCodeSnapshot: dispatchCode,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });

      // 4c. Create Dispatch Item Record
      const dispatchItemRef = doc(collection(db, DISPATCH_ITEMS_COLLECTION));
      transaction.set(dispatchItemRef, {
        dispatchId: dispatchRef.id,
        orderId,
        orderItemId: vItem.orderItem.id,
        productId: vItem.orderItem.productId,
        productCodeSnapshot: vItem.orderItem.productCodeSnapshot,
        productNameSnapshot: vItem.orderItem.productNameSnapshot,
        unit: vItem.orderItem.unit,
        quantity: vItem.dispatchQuantity,
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });

      // 4d. Update Order Item Dispatched Quantities
      transaction.update(vItem.orderItemRef, {
        dispatchedQuantity: vItem.newDispatchedQuantity,
        pendingDispatchQuantity: vItem.newPendingDispatch,
        updatedAt: serverTimestamp(),
        updatedBy: userIdentifier,
      });

      if (vItem.newPendingDispatch > 0) {
        allItemsFullyDispatched = false;
      }
    }

    // 5. UPDATE SEQUENTIAL COUNTER
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    // 6. UPDATE ORDER STATUS
    const newOrderStatus: OrderStatus = allItemsFullyDispatched
      ? 'DISPATCHED'
      : 'PARTIALLY_DISPATCHED';

    transaction.update(orderRef, {
      status: newOrderStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    const dispatchDateTimestamp = input.dispatchDate ? Timestamp.fromDate(input.dispatchDate) : Timestamp.now();

    // 7. CREATE DISPATCH MASTER RECORD
    const dispatchData = {
      dispatchCode,
      orderId,
      orderCodeSnapshot: order.orderCode,
      customerId: order.customerId,
      customerCodeSnapshot: order.customerCodeSnapshot,
      customerNameSnapshot: order.customerNameSnapshot,
      dispatchDate: dispatchDateTimestamp,
      deliveryAddress: input.deliveryAddress?.trim() || '',
      vehicleNumber: input.vehicleNumber?.trim() || '',
      transporter: input.transporter?.trim() || '',
      trackingNumber: input.trackingNumber?.trim() || '',
      status: input.status || 'DISPATCHED',
      totalQuantity: totalDispatchQuantity,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(dispatchRef, dispatchData);

    return {
      id: dispatchRef.id,
      ...dispatchData,
      dispatchDate: dispatchDateTimestamp,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Dispatch;
  });
}
