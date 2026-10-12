import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Order,
  OrderItem,
  OrderFilterOptions,
  OrderDetailsResult,
  Dispatch,
  Payment,
  ProductionOrderLink,
} from './orderTypes.ts';

const ORDERS_COLLECTION = 'orders';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const DISPATCHES_COLLECTION = 'dispatches';
const PAYMENTS_COLLECTION = 'payments';
const PRODUCTION_LINKS_COLLECTION = 'productionOrderLinks';

export interface FetchOrdersResult {
  items: Order[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Fetches a single order by ID.
 */
export async function getOrder(id: string): Promise<Order | null> {
  const docRef = doc(db, ORDERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Order;
}

/**
 * Fetches all order items for a specific order.
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const q = query(
    collection(db, ORDER_ITEMS_COLLECTION),
    where('orderId', '==', orderId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as OrderItem[];
}

/**
 * Fetches compound order details: Order master, line items, dispatches, payments, and production links.
 */
export async function getOrderDetails(orderId: string): Promise<OrderDetailsResult | null> {
  const order = await getOrder(orderId);
  if (!order) return null;

  const [items, dispatchesSnap, paymentsSnap, linksSnap] = await Promise.all([
    getOrderItems(orderId),
    getDocs(
      query(
        collection(db, DISPATCHES_COLLECTION),
        where('orderId', '==', orderId),
        orderBy('createdAt', 'desc')
      )
    ),
    getDocs(
      query(
        collection(db, PAYMENTS_COLLECTION),
        where('orderId', '==', orderId),
        orderBy('paymentDate', 'desc')
      )
    ),
    getDocs(
      query(
        collection(db, PRODUCTION_LINKS_COLLECTION),
        where('orderId', '==', orderId),
        orderBy('createdAt', 'desc')
      )
    ),
  ]);

  const dispatches = dispatchesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Dispatch[];
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[];
  const productionLinks = linksSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductionOrderLink[];

  return {
    order,
    items,
    dispatches,
    payments,
    productionLinks,
  };
}

/**
 * Queries paginated orders with cursor pagination and filters.
 */
export async function getOrders(
  options: OrderFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchOrdersResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  if (options.customerId && options.customerId !== 'ALL') {
    constraints.push(where('customerId', '==', options.customerId));
  }

  constraints.push(orderBy('orderDate', 'desc'));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, ORDERS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawItems = querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Order[];

  // Client-side search query filtering
  if (options.searchQuery?.trim()) {
    const term = options.searchQuery.trim().toLowerCase();
    rawItems = rawItems.filter(
      (o) =>
        o.orderCode.toLowerCase().includes(term) ||
        o.customerNameSnapshot.toLowerCase().includes(term) ||
        o.customerCodeSnapshot.toLowerCase().includes(term) ||
        (o.notes && o.notes.toLowerCase().includes(term))
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
