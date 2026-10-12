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
  Dispatch,
  DispatchItem,
  DispatchFilterOptions,
  DispatchDetailsResult,
} from './orderTypes.ts';

const DISPATCHES_COLLECTION = 'dispatches';
const DISPATCH_ITEMS_COLLECTION = 'dispatchItems';

export interface FetchDispatchesResult {
  items: Dispatch[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Fetches a single dispatch record by ID.
 */
export async function getDispatch(id: string): Promise<Dispatch | null> {
  const docRef = doc(db, DISPATCHES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Dispatch;
}

/**
 * Fetches line items for a specific dispatch.
 */
export async function getDispatchItems(dispatchId: string): Promise<DispatchItem[]> {
  const q = query(
    collection(db, DISPATCH_ITEMS_COLLECTION),
    where('dispatchId', '==', dispatchId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as DispatchItem[];
}

/**
 * Fetches full details for a dispatch (master + line items).
 */
export async function getDispatchDetails(dispatchId: string): Promise<DispatchDetailsResult | null> {
  const dispatch = await getDispatch(dispatchId);
  if (!dispatch) return null;

  const items = await getDispatchItems(dispatchId);
  return {
    dispatch,
    items,
  };
}

/**
 * Queries paginated dispatches with cursor pagination and search.
 */
export async function getDispatches(
  options: DispatchFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchDispatchesResult> {
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

  constraints.push(orderBy('dispatchDate', 'desc'));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  constraints.push(limit(pageSize + 1));

  const q = query(collection(db, DISPATCHES_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawItems = querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Dispatch[];

  if (options.searchQuery?.trim()) {
    const term = options.searchQuery.trim().toLowerCase();
    rawItems = rawItems.filter(
      (d) =>
        d.dispatchCode.toLowerCase().includes(term) ||
        d.orderCodeSnapshot.toLowerCase().includes(term) ||
        d.customerNameSnapshot.toLowerCase().includes(term) ||
        (d.vehicleNumber && d.vehicleNumber.toLowerCase().includes(term)) ||
        (d.transporter && d.transporter.toLowerCase().includes(term))
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
