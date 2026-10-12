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
  Purchase,
  PurchaseItem,
  PurchaseFilterOptions,
} from './purchaseTypes.ts';

const PURCHASES_COLLECTION = 'purchases';
const PURCHASE_ITEMS_COLLECTION = 'purchaseItems';

export interface FetchPurchasesResult {
  items: Purchase[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface PurchaseDetailsResult {
  purchase: Purchase;
  items: PurchaseItem[];
}

/**
 * Queries paginated purchases with server-side filters and cursor pagination.
 */
export async function getPurchases(
  options: PurchaseFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchPurchasesResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  // Filter by supplier
  if (options.supplierId && options.supplierId !== 'ALL') {
    constraints.push(where('supplierId', '==', options.supplierId));
  }

  // Filter by status
  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, PURCHASES_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Purchase[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Purchase[];

  // In-page search by purchase code, supplier name, or invoice number
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (p) =>
        (p.purchaseCode && p.purchaseCode.toLowerCase().includes(queryLower)) ||
        (p.supplierNameSnapshot && p.supplierNameSnapshot.toLowerCase().includes(queryLower)) ||
        (p.supplierCodeSnapshot && p.supplierCodeSnapshot.toLowerCase().includes(queryLower)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(queryLower))
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}

/**
 * Fetches a single purchase master record.
 */
export async function getPurchase(id: string): Promise<Purchase | null> {
  const docRef = doc(db, PURCHASES_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Purchase;
}

/**
 * Fetches complete purchase details along with line items.
 */
export async function getPurchaseDetails(
  purchaseId: string
): Promise<PurchaseDetailsResult | null> {
  const purchase = await getPurchase(purchaseId);
  if (!purchase) return null;

  const itemsQuery = query(
    collection(db, PURCHASE_ITEMS_COLLECTION),
    where('purchaseId', '==', purchaseId)
  );
  const itemsSnap = await getDocs(itemsQuery);

  const items: PurchaseItem[] = itemsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as PurchaseItem[];

  return {
    purchase,
    items,
  };
}

/**
 * Fetches purchase history for a specific supplier.
 */
export async function getPurchasesBySupplier(
  supplierId: string,
  limitCount = 20
): Promise<Purchase[]> {
  const q = query(
    collection(db, PURCHASES_COLLECTION),
    where('supplierId', '==', supplierId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Purchase[];
}
