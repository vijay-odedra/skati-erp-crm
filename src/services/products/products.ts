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
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
  type QueryConstraint,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductFilterOptions,
} from './productTypes.ts';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../constants/products.ts';
import { hasActiveBomItems } from './bom.ts';

const PRODUCTS_COLLECTION = 'products';
const COUNTERS_COLLECTION = 'counters';
const PRODUCT_COUNTER_ID = 'products';

export interface FetchProductsResult {
  items: Product[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Product Master record with atomic sequential code generation (FG-XXXX).
 */
export async function createProduct(
  input: CreateProductInput,
  userIdentifier: string
): Promise<Product> {
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Product name is required.');
  }
  if (name.length > 100) {
    throw new Error('Product name must not exceed 100 characters.');
  }

  if (!input.category || !PRODUCT_CATEGORIES.includes(input.category)) {
    throw new Error('Valid product category is required.');
  }

  if (!input.unit || !PRODUCT_UNITS.some((u) => u.value === input.unit)) {
    throw new Error('Valid product unit of measure is required.');
  }

  const newProductRef = doc(collection(db, PRODUCTS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, PRODUCT_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    // 1. Get and atomically increment product counter
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const productCode = `FG-${String(nextCount).padStart(4, '0')}`;

    // 2. Prepare product data
    const productData = {
      productCode,
      name,
      category: input.category,
      description: input.description?.trim() || '',
      unit: input.unit,
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    // 3. Commit counter and product
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newProductRef, productData);

    return {
      id: newProductRef.id,
      ...productData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Product;
  });
}

/**
 * Updates an existing Product Master record.
 * Protects immutable productCode and prevents unit changes if active BOM items exist.
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  userIdentifier: string
): Promise<void> {
  const productRef = doc(db, PRODUCTS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(productRef);
    if (!docSnap.exists()) {
      throw new Error('Product not found.');
    }

    const currentData = docSnap.data();
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Product name cannot be empty.');
      if (name.length > 100) throw new Error('Product name must not exceed 100 characters.');
      updates.name = name;
    }

    if (input.category !== undefined) {
      if (!PRODUCT_CATEGORIES.includes(input.category)) {
        throw new Error('Invalid product category.');
      }
      updates.category = input.category;
    }

    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }

    if (input.unit !== undefined && input.unit !== currentData.unit) {
      if (!PRODUCT_UNITS.some((u) => u.value === input.unit)) {
        throw new Error('Invalid product unit.');
      }
      // Check if product has active BOM items before changing unit
      const hasBom = await hasActiveBomItems(id);
      if (hasBom) {
        throw new Error(
          'Cannot change product unit because this product already has active Bill of Materials (BOM) items.'
        );
      }
      updates.unit = input.unit;
    }

    if (input.isActive !== undefined) {
      updates.isActive = Boolean(input.isActive);
    }

    transaction.update(productRef, updates);
  });
}

/**
 * Fetches a single Product by ID.
 */
export async function getProduct(id: string): Promise<Product | null> {
  const docRef = doc(db, PRODUCTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Product;
}

/**
 * Queries paginated products with server-side filters and cursor-based pagination.
 */
export async function getProducts(
  options: ProductFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchProductsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  // Filter by active state
  if (options.activeStatus && options.activeStatus !== 'ALL') {
    constraints.push(where('isActive', '==', options.activeStatus === 'ACTIVE'));
  }

  // Filter by category
  if (options.category && options.category !== 'ALL') {
    constraints.push(where('category', '==', options.category));
  }

  // Filter by unit
  if (options.unit && options.unit !== 'ALL') {
    constraints.push(where('unit', '==', options.unit));
  }

  // Order by productCode
  constraints.push(orderBy('productCode', 'asc'));

  // Limit + 1 to check hasMore
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, PRODUCTS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Product[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Product[];

  // In-page search by product name or code
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.productCode.toLowerCase().includes(queryLower)
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
