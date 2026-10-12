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
  RawMaterial,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  RawMaterialFilterOptions,
} from './inventoryTypes.ts';

const RAW_MATERIALS_COLLECTION = 'rawMaterials';
const STOCK_TRANSACTIONS_COLLECTION = 'stockTransactions';
const COUNTERS_COLLECTION = 'counters';
const RAW_MATERIAL_COUNTER_ID = 'rawMaterials';

/**
 * Creates a new Raw Material Master record with atomic code generation and initial stock transaction.
 */
export async function createRawMaterial(
  input: CreateRawMaterialInput,
  userIdentifier: string
): Promise<RawMaterial> {
  // Input validation
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Material name is required.');
  }
  if (!input.category) {
    throw new Error('Material category is required.');
  }
  if (!input.unit) {
    throw new Error('Material unit of measure is required.');
  }
  const minimumStock = Number(input.minimumStock) || 0;
  if (minimumStock < 0) {
    throw new Error('Minimum stock cannot be negative.');
  }
  const initialStock = Number(input.initialStock) || 0;
  if (initialStock < 0) {
    throw new Error('Initial stock cannot be negative.');
  }

  // Piece units must be whole numbers
  if (input.unit === 'piece') {
    if (!Number.isInteger(minimumStock)) {
      throw new Error('Minimum stock for unit "Piece" must be a whole integer number.');
    }
    if (!Number.isInteger(initialStock)) {
      throw new Error('Initial stock for unit "Piece" must be a whole integer number.');
    }
  }

  const newMaterialRef = doc(collection(db, RAW_MATERIALS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, RAW_MATERIAL_COUNTER_ID);
  const initialTxRef = doc(collection(db, STOCK_TRANSACTIONS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. Get or initialize sequential material code counter
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const materialCode = `RM-${String(nextCount).padStart(4, '0')}`;

    // 2. Prepare raw material document data
    const materialData = {
      materialCode,
      name,
      category: input.category,
      description: input.description?.trim() || '',
      unit: input.unit,
      currentStock: initialStock,
      minimumStock,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    // 3. Update counter and create raw material doc
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newMaterialRef, materialData);

    // 4. Create INITIAL stock transaction ONLY IF initialStock > 0
    if (initialStock > 0) {
      transaction.set(initialTxRef, {
        rawMaterialId: newMaterialRef.id,
        rawMaterialNameSnapshot: name,
        type: 'INITIAL',
        quantity: initialStock,
        unit: input.unit,
        referenceType: 'INITIAL_SETUP',
        reason: 'Initial stock on material creation',
        createdAt: serverTimestamp(),
        createdBy: userIdentifier,
      });
    }

    return {
      id: newMaterialRef.id,
      ...materialData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as RawMaterial;
  });
}

/**
 * Updates non-stock master properties of a Raw Material.
 */
export async function updateRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
  userIdentifier: string
): Promise<void> {
  const materialRef = doc(db, RAW_MATERIALS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(materialRef);
    if (!docSnap.exists()) {
      throw new Error('Raw material not found.');
    }

    const currentData = docSnap.data();
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Material name cannot be empty.');
      updates.name = name;
    }
    if (input.category !== undefined) {
      updates.category = input.category;
    }
    if (input.description !== undefined) {
      updates.description = input.description.trim();
    }
    if (input.minimumStock !== undefined) {
      const minStock = Number(input.minimumStock);
      if (minStock < 0) throw new Error('Minimum stock cannot be negative.');
      if (currentData.unit === 'piece' && !Number.isInteger(minStock)) {
        throw new Error('Minimum stock for unit "Piece" must be a whole integer number.');
      }
      updates.minimumStock = minStock;
    }
    if (input.isActive !== undefined) {
      updates.isActive = Boolean(input.isActive);
    }

    transaction.update(materialRef, updates);
  });
}

/**
 * Fetches a single raw material by ID.
 */
export async function getRawMaterial(id: string): Promise<RawMaterial | null> {
  const docRef = doc(db, RAW_MATERIALS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as RawMaterial;
}

export interface FetchRawMaterialsResult {
  items: RawMaterial[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Queries paginated raw materials with efficient server-side filters and cursor pagination.
 */
export async function getRawMaterials(
  options: RawMaterialFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchRawMaterialsResult> {
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

  // Order by materialCode
  constraints.push(orderBy('materialCode', 'asc'));

  // Pagination limit (+1 to detect hasMore)
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, RAW_MATERIALS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: RawMaterial[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as RawMaterial[];

  // In-page search for material name or code when searchQuery is provided
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (m) =>
        m.name.toLowerCase().includes(queryLower) ||
        m.materialCode.toLowerCase().includes(queryLower)
    );
  }

  // In-page stock status filter if specified
  if (options.stockStatus && options.stockStatus !== 'ALL') {
    items = items.filter((m) => {
      if (options.stockStatus === 'OUT_OF_STOCK') return m.currentStock <= 0;
      if (options.stockStatus === 'LOW_STOCK')
        return m.currentStock > 0 && m.currentStock <= m.minimumStock;
      if (options.stockStatus === 'NORMAL')
        return m.currentStock > m.minimumStock;
      return true;
    });
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
