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
  Production,
  ProductionItem,
  ProductionFilterOptions,
} from './productionTypes.ts';

const PRODUCTIONS_COLLECTION = 'productions';
const PRODUCTION_ITEMS_COLLECTION = 'productionItems';

export interface FetchProductionsResult {
  items: Production[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

export interface ProductionDetailsResult {
  production: Production;
  consumedItems: ProductionItem[];
}

/**
 * Queries paginated production logs with server-side filters and cursor pagination.
 */
export async function getProductions(
  options: ProductionFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchProductionsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  // Filter by production area
  if (options.productionArea && options.productionArea !== 'ALL') {
    constraints.push(where('productionArea', '==', options.productionArea));
  }

  // Filter by status
  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  // Filter by specific product
  if (options.productId && options.productId !== 'ALL') {
    constraints.push(where('productId', '==', options.productId));
  }

  // Order by createdAt descending
  constraints.push(orderBy('createdAt', 'desc'));

  // Limit + 1 for pagination
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, PRODUCTIONS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Production[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Production[];

  // In-page search by code or product name
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.productionCode.toLowerCase().includes(queryLower) ||
        p.productNameSnapshot.toLowerCase().includes(queryLower) ||
        p.productCodeSnapshot.toLowerCase().includes(queryLower)
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
 * Fetches a single production record by ID.
 */
export async function getProduction(id: string): Promise<Production | null> {
  const docRef = doc(db, PRODUCTIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Production;
}

/**
 * Fetches complete production details along with its immutable BOM consumption snapshots.
 */
export async function getProductionDetails(
  productionId: string
): Promise<ProductionDetailsResult | null> {
  const prod = await getProduction(productionId);
  if (!prod) return null;

  const itemsQuery = query(
    collection(db, PRODUCTION_ITEMS_COLLECTION),
    where('productionId', '==', productionId)
  );
  const itemsSnap = await getDocs(itemsQuery);

  const consumedItems: ProductionItem[] = itemsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ProductionItem[];

  return {
    production: prod,
    consumedItems,
  };
}
