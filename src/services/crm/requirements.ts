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
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  CustomerRequirement,
  CreateRequirementInput,
  UpdateRequirementInput,
  RequirementFilterOptions,
  Customer,
} from './crmTypes.ts';
import type { Product } from '../products/productTypes.ts';

const REQUIREMENTS_COLLECTION = 'customerRequirements';
const CUSTOMERS_COLLECTION = 'customers';
const PRODUCTS_COLLECTION = 'products';
const COUNTERS_COLLECTION = 'counters';
const REQUIREMENT_COUNTER_ID = 'requirements';

export interface FetchRequirementsResult {
  items: CustomerRequirement[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Customer Requirement with atomic sequential code (REQ-000001).
 */
export async function createRequirement(
  input: CreateRequirementInput,
  userIdentifier: string
): Promise<CustomerRequirement> {
  const customerId = input.customerId?.trim();
  if (!customerId) {
    throw new Error('Customer ID is required.');
  }

  const title = input.title?.trim();
  if (!title) {
    throw new Error('Requirement title is required.');
  }

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const newReqRef = doc(collection(db, REQUIREMENTS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, REQUIREMENT_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    // 1. Validate customer
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error(`Customer with ID "${customerId}" does not exist.`);
    }
    const customer = customerSnap.data() as Customer;

    // 2. Validate product if provided
    let productSnapshot: Partial<Product> | null = null;
    if (input.productId?.trim()) {
      const prodRef = doc(db, PRODUCTS_COLLECTION, input.productId.trim());
      const prodSnap = await transaction.get(prodRef);
      if (prodSnap.exists()) {
        productSnapshot = prodSnap.data() as Product;
      }
    }

    // 3. Increment counter
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const requirementCode = `REQ-${String(nextCount).padStart(6, '0')}`;

    const expectedDateTimestamp = input.expectedDate ? Timestamp.fromDate(input.expectedDate) : null;

    const reqData = {
      requirementCode,
      customerId,
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.name,
      title,
      description: input.description?.trim() || '',
      productId: input.productId?.trim() || '',
      productCodeSnapshot: productSnapshot?.productCode || '',
      productNameSnapshot: productSnapshot?.name || '',
      quantity: input.quantity ? Number(input.quantity) : 0,
      unit: input.unit?.trim() || productSnapshot?.unit || '',
      expectedDate: expectedDateTimestamp,
      status: input.status || 'OPEN',
      priority: input.priority || 'MEDIUM',
      assignedTo: input.assignedTo?.trim() || customer.assignedTo,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newReqRef, reqData);

    return {
      id: newReqRef.id,
      ...reqData,
      expectedDate: expectedDateTimestamp || undefined,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as CustomerRequirement;
  });
}

/**
 * Updates an existing Customer Requirement record.
 */
export async function updateRequirement(
  id: string,
  input: UpdateRequirementInput,
  userIdentifier: string
): Promise<void> {
  const reqRef = doc(db, REQUIREMENTS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(reqRef);
    if (!snap.exists()) {
      throw new Error('Requirement not found.');
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.productId !== undefined) updates.productId = input.productId.trim();
    if (input.quantity !== undefined) updates.quantity = Number(input.quantity);
    if (input.unit !== undefined) updates.unit = input.unit.trim();
    if (input.expectedDate !== undefined) updates.expectedDate = input.expectedDate ? Timestamp.fromDate(input.expectedDate) : null;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim();

    transaction.update(reqRef, updates);
  });
}

/**
 * Fetches a single Requirement by ID.
 */
export async function getRequirement(id: string): Promise<CustomerRequirement | null> {
  const docRef = doc(db, REQUIREMENTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as CustomerRequirement;
}

/**
 * Queries paginated requirements with cursor pagination.
 */
export async function getRequirements(
  options: RequirementFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchRequirementsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.customerId && options.customerId !== 'ALL') {
    constraints.push(where('customerId', '==', options.customerId));
  }

  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  if (options.priority && options.priority !== 'ALL') {
    constraints.push(where('priority', '==', options.priority));
  }

  if (options.assignedTo && options.assignedTo !== 'ALL') {
    constraints.push(where('assignedTo', '==', options.assignedTo));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, REQUIREMENTS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: CustomerRequirement[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as CustomerRequirement[];

  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (r) =>
        r.requirementCode.toLowerCase().includes(queryLower) ||
        r.title.toLowerCase().includes(queryLower) ||
        r.customerNameSnapshot.toLowerCase().includes(queryLower) ||
        (r.productNameSnapshot && r.productNameSnapshot.toLowerCase().includes(queryLower))
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
