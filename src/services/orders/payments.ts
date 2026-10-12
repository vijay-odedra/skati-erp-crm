import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Payment,
  RecordPaymentInput,
  PaymentFilterOptions,
  Order,
  OrderStatus,
} from './orderTypes.ts';

const PAYMENTS_COLLECTION = 'payments';
const ORDERS_COLLECTION = 'orders';
const COUNTERS_COLLECTION = 'counters';
const PAYMENT_COUNTER_ID = 'payments';

export interface FetchPaymentsResult {
  items: Payment[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Records a client payment against a sales order in an atomic transaction:
 * 1. Reads order and validates remaining pending balance
 * 2. Generates sequential code PAY-XXXXXX
 * 3. Creates payment document
 * 4. Updates order paidAmount and pendingAmount
 * 5. If order is DISPATCHED and fully paid, completes the order
 */
export async function recordPayment(
  input: RecordPaymentInput,
  userIdentifier: string
): Promise<Payment> {
  const orderId = input.orderId?.trim();
  if (!orderId) {
    throw new Error('Order ID is required to record payment.');
  }

  const amount = Number(input.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Payment amount must be a positive number greater than zero.');
  }

  if (!input.paymentMethod) {
    throw new Error('Payment method is required.');
  }

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const counterRef = doc(db, COUNTERS_COLLECTION, PAYMENT_COUNTER_ID);
  const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. READ ORDER
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error(`Order with ID "${orderId}" does not exist.`);
    }

    const order = orderSnap.data() as Order;
    if (order.status === 'CANCELLED') {
      throw new Error('Cannot record payments against a CANCELLED order.');
    }

    const currentPaid = Number((order.paidAmount || 0).toFixed(2));
    const currentPending = Number((order.pendingAmount !== undefined ? order.pendingAmount : order.grandTotal - currentPaid).toFixed(2));

    if (amount > currentPending + 0.01) { // 0.01 epsilon for rounding safety
      throw new Error(
        `Payment amount of ₹${amount.toFixed(2)} exceeds remaining order balance of ₹${currentPending.toFixed(2)}.`
      );
    }

    const newPaidAmount = Number((currentPaid + amount).toFixed(2));
    const newPendingAmount = Math.max(0, Number((order.grandTotal - newPaidAmount).toFixed(2)));

    // 2. READ COUNTER
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const paymentCode = `PAY-${String(nextCount).padStart(6, '0')}`;

    // 3. WRITES
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    const paymentDateTimestamp = input.paymentDate ? Timestamp.fromDate(input.paymentDate) : Timestamp.now();

    const paymentData = {
      paymentCode,
      orderId,
      orderCodeSnapshot: order.orderCode,
      customerId: order.customerId,
      customerCodeSnapshot: order.customerCodeSnapshot,
      customerNameSnapshot: order.customerNameSnapshot,
      paymentDate: paymentDateTimestamp,
      amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber?.trim() || '',
      status: 'RECEIVED' as const,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
    };

    transaction.set(paymentRef, paymentData);

    // Update order paidAmount, pendingAmount, and status if fully fulfilled and fully paid
    const orderUpdates: Record<string, unknown> = {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (order.status === 'DISPATCHED' && newPendingAmount === 0) {
      orderUpdates.status = 'COMPLETED' as OrderStatus;
    }

    transaction.update(orderRef, orderUpdates);

    return {
      id: paymentRef.id,
      ...paymentData,
      paymentDate: paymentDateTimestamp,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Payment;
  });
}

/**
 * Fetches all payments for a specific order.
 */
export async function getPaymentsByOrder(orderId: string): Promise<Payment[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('orderId', '==', orderId),
    orderBy('paymentDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Payment[];
}

/**
 * Queries paginated payments with cursor pagination and search.
 */
export async function getPayments(
  options: PaymentFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchPaymentsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  if (options.orderId && options.orderId !== 'ALL') {
    constraints.push(where('orderId', '==', options.orderId));
  }

  if (options.customerId && options.customerId !== 'ALL') {
    constraints.push(where('customerId', '==', options.customerId));
  }

  constraints.push(orderBy('paymentDate', 'desc'));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, PAYMENTS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawItems = querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Payment[];

  if (options.searchQuery?.trim()) {
    const term = options.searchQuery.trim().toLowerCase();
    rawItems = rawItems.filter(
      (p) =>
        p.paymentCode.toLowerCase().includes(term) ||
        p.orderCodeSnapshot.toLowerCase().includes(term) ||
        p.customerNameSnapshot.toLowerCase().includes(term) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term))
    );
  }

  const hasMore = rawItems.length > pageSize;
  const items = hasMore ? rawItems.slice(0, pageSize) : rawItems;
  const lastDoc = hasMore && querySnapshot.docs.length > pageSize
    ? querySnapshot.docs[pageSize - 1]
    : querySnapshot.docs[querySnapshot.docs.length - 1] || null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
