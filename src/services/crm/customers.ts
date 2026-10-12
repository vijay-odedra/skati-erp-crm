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
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilterOptions,
} from './crmTypes.ts';

const CUSTOMERS_COLLECTION = 'customers';
const COUNTERS_COLLECTION = 'counters';
const CUSTOMER_COUNTER_ID = 'customers';

export interface FetchCustomersResult {
  items: Customer[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Customer directly with atomic sequential code generation (CUS-000001).
 */
export async function createCustomer(
  input: CreateCustomerInput,
  userIdentifier: string
): Promise<Customer> {
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Customer name is required.');
  }

  const phone = input.phone?.trim();
  if (!phone) {
    throw new Error('Phone number is required.');
  }

  if (input.email?.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input.email.trim())) {
      throw new Error('Invalid email address format.');
    }
  }

  if (!input.assignedTo?.trim()) {
    throw new Error('Assigned account representative is required.');
  }

  const newCustomerRef = doc(collection(db, CUSTOMERS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, CUSTOMER_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const customerCode = `CUS-${String(nextCount).padStart(6, '0')}`;

    const customerData = {
      customerCode,
      name,
      companyName: input.companyName?.trim() || '',
      phone,
      email: input.email?.trim() || '',
      billingAddress: input.billingAddress?.trim() || '',
      shippingAddress: input.shippingAddress?.trim() || '',
      city: input.city?.trim() || '',
      state: input.state?.trim() || '',
      gstNumber: input.gstNumber?.trim().toUpperCase() || '',
      contactPerson: input.contactPerson?.trim() || '',
      notes: input.notes?.trim() || '',
      sourceLeadId: input.sourceLeadId || '',
      assignedTo: input.assignedTo.trim(),
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newCustomerRef, customerData);

    return {
      id: newCustomerRef.id,
      ...customerData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Customer;
  });
}

/**
 * Updates an existing Customer record.
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  userIdentifier: string
): Promise<void> {
  const customerRef = doc(db, CUSTOMERS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(customerRef);
    if (!docSnap.exists()) {
      throw new Error('Customer record not found.');
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Customer name cannot be empty.');
      updates.name = name;
    }

    if (input.phone !== undefined) {
      const phone = input.phone.trim();
      if (!phone) throw new Error('Phone number cannot be empty.');
      updates.phone = phone;
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
    if (input.billingAddress !== undefined) updates.billingAddress = input.billingAddress.trim();
    if (input.shippingAddress !== undefined) updates.shippingAddress = input.shippingAddress.trim();
    if (input.city !== undefined) updates.city = input.city.trim();
    if (input.state !== undefined) updates.state = input.state.trim();
    if (input.gstNumber !== undefined) updates.gstNumber = input.gstNumber.trim().toUpperCase();
    if (input.contactPerson !== undefined) updates.contactPerson = input.contactPerson.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim();
    if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo.trim();
    if (input.isActive !== undefined) updates.isActive = Boolean(input.isActive);

    transaction.update(customerRef, updates);
  });
}

/**
 * Fetches a single Customer by ID.
 */
export async function getCustomer(id: string): Promise<Customer | null> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Customer;
}

/**
 * Queries paginated customers with cursor pagination.
 */
export async function getCustomers(
  options: CustomerFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchCustomersResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.activeStatus && options.activeStatus !== 'ALL') {
    constraints.push(where('isActive', '==', options.activeStatus === 'ACTIVE'));
  }

  if (options.assignedTo && options.assignedTo !== 'ALL') {
    constraints.push(where('assignedTo', '==', options.assignedTo));
  }

  constraints.push(orderBy('customerCode', 'asc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, CUSTOMERS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Customer[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Customer[];

  // In-page search by name, code, company, phone, or city
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (c) =>
        c.customerCode.toLowerCase().includes(queryLower) ||
        c.name.toLowerCase().includes(queryLower) ||
        (c.companyName && c.companyName.toLowerCase().includes(queryLower)) ||
        c.phone.includes(queryLower) ||
        (c.city && c.city.toLowerCase().includes(queryLower))
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
