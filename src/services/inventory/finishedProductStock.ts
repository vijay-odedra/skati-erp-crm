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
  FinishedProductStock,
  FinishedProductTransaction,
} from '../production/productionTypes.ts';

const FINISHED_STOCK_COLLECTION = 'finishedProductStock';
const FINISHED_TX_COLLECTION = 'finishedProductTransactions';

/**
 * Fetches the finished goods stock document for a given product.
 */
export async function getFinishedProductStock(
  productId: string
): Promise<FinishedProductStock | null> {
  const docRef = doc(db, FINISHED_STOCK_COLLECTION, productId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { productId: docSnap.id, ...docSnap.data() } as FinishedProductStock;
}

/**
 * Fetches finished products stock balances with cursor pagination.
 */
export async function getFinishedProductStockList(
  pageSize = 20,
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<{
  items: FinishedProductStock[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}> {
  const constraints: QueryConstraint[] = [
    orderBy('productCodeSnapshot', 'asc'),
    limit(pageSize + 1),
  ];
  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, FINISHED_STOCK_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let rawDocs = snapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  const items: FinishedProductStock[] = rawDocs.map((d) => ({
    productId: d.id,
    ...d.data(),
  })) as FinishedProductStock[];

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}

/**
 * Fetches immutable finished goods stock ledger transactions for a specific product.
 */
export async function getFinishedProductTransactions(
  productId: string,
  limitCount = 30
): Promise<FinishedProductTransaction[]> {
  const q = query(
    collection(db, FINISHED_TX_COLLECTION),
    where('productId', '==', productId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as FinishedProductTransaction[];
}
