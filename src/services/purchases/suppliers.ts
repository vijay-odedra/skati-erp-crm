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
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierFilterOptions,
} from './purchaseTypes.ts';

const SUPPLIERS_COLLECTION = 'suppliers';
const COUNTERS_COLLECTION = 'counters';
const SUPPLIER_COUNTER_ID = 'suppliers';

export interface FetchSuppliersResult {
  items: Supplier[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Supplier Master record with atomic sequential code generation (SUP-XXXX).
 */
export async function createSupplier(
  input: CreateSupplierInput,
  userIdentifier: string
): Promise<Supplier> {
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Supplier name is required.');
  }
  if (name.length > 100) {
    throw new Error('Supplier name must not exceed 100 characters.');
  }

  // Basic email validation if provided
  if (input.email?.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input.email.trim())) {
      throw new Error('Invalid email address format.');
    }
  }

  const newSupplierRef = doc(collection(db, SUPPLIERS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, SUPPLIER_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    // 1. Get and atomically increment sequential supplier code
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const supplierCode = `SUP-${String(nextCount).padStart(4, '0')}`;

    // 2. Prepare supplier document
    const supplierData = {
      supplierCode,
      name,
      companyName: input.companyName?.trim() || '',
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
      address: input.address?.trim() || '',
      city: input.city?.trim() || '',
      state: input.state?.trim() || '',
      gstNumber: input.gstNumber?.trim().toUpperCase() || '',
      contactPerson: input.contactPerson?.trim() || '',
      notes: input.notes?.trim() || '',
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    // 3. Commit counter and supplier
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newSupplierRef, supplierData);

    return {
      id: newSupplierRef.id,
      ...supplierData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Supplier;
  });
}

/**
 * Updates an existing Supplier Master record with immutable supplierCode protection.
 */
export async function updateSupplier(
  id: string,
  input: UpdateSupplierInput,
  userIdentifier: string
): Promise<void> {
  const supplierRef = doc(db, SUPPLIERS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(supplierRef);
    if (!docSnap.exists()) {
      throw new Error('Supplier not found.');
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Supplier name cannot be empty.');
      if (name.length > 100) throw new Error('Supplier name must not exceed 100 characters.');
      updates.name = name;
    }

    if (input.email !== undefined && input.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input.email.trim())) {
        throw new Error('Invalid email address format.');
      }
      updates.email = input.email.trim();
    } else if (input.email !== undefined) {
      updates.email = '';
    }

    if (input.companyName !== undefined) updates.companyName = input.companyName.trim();
    if (input.phone !== undefined) updates.phone = input.phone.trim();
    if (input.address !== undefined) updates.address = input.address.trim();
    if (input.city !== undefined) updates.city = input.city.trim();
    if (input.state !== undefined) updates.state = input.state.trim();
    if (input.gstNumber !== undefined) updates.gstNumber = input.gstNumber.trim().toUpperCase();
    if (input.contactPerson !== undefined) updates.contactPerson = input.contactPerson.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim();
    if (input.isActive !== undefined) updates.isActive = Boolean(input.isActive);

    transaction.update(supplierRef, updates);
  });
}

/**
 * Fetches a single supplier by ID.
 */
export async function getSupplier(id: string): Promise<Supplier | null> {
  const docRef = doc(db, SUPPLIERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Supplier;
}

/**
 * Queries paginated suppliers with cursor-based pagination and search.
 */
export async function getSuppliers(
  options: SupplierFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchSuppliersResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.activeStatus && options.activeStatus !== 'ALL') {
    constraints.push(where('isActive', '==', options.activeStatus === 'ACTIVE'));
  }

  constraints.push(orderBy('supplierCode', 'asc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, SUPPLIERS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Supplier[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Supplier[];

  // In-page search by code, name, company, or city
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (s) =>
        (s.supplierCode && s.supplierCode.toLowerCase().includes(queryLower)) ||
        (s.name && s.name.toLowerCase().includes(queryLower)) ||
        (s.companyName && s.companyName.toLowerCase().includes(queryLower)) ||
        (s.city && s.city.toLowerCase().includes(queryLower))
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
