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
  Quotation,
  QuotationItem,
  CreateQuotationInput,
  QuotationFilterOptions,
  QuotationDetailsResult,
  Customer,
} from './crmTypes.ts';

const QUOTATIONS_COLLECTION = 'quotations';
const QUOTATION_ITEMS_COLLECTION = 'quotationItems';
const CUSTOMERS_COLLECTION = 'customers';
const COUNTERS_COLLECTION = 'counters';
const QUOTATION_COUNTER_ID = 'quotations';

export interface FetchQuotationsResult {
  items: Quotation[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Quotation along with line items inside a single atomic transaction.
 */
export async function createQuotation(
  input: CreateQuotationInput,
  userIdentifier: string
): Promise<Quotation> {
  const customerId = input.customerId?.trim();
  if (!customerId) {
    throw new Error('Customer ID is required.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('Quotation must contain at least one product line item.');
  }

  // Duplicate item prevention for items with productId
  const productIds = input.items
    .map((it) => it.productId?.trim())
    .filter((id): id is string => Boolean(id));
  const uniqueProductIds = new Set(productIds);
  if (uniqueProductIds.size !== productIds.length) {
    throw new Error(
      'Duplicate products detected in quotation lines. Combine quantities into a single line.'
    );
  }

  // Pre-validate item quantities and prices
  for (const it of input.items) {
    const qty = Number(it.quantity);
    const price = Number(it.unitPrice);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for line item "${it.productName}".`);
    }
    if (isNaN(price) || price < 0) {
      throw new Error(`Invalid unit price for line item "${it.productName}".`);
    }
  }

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const quotationRef = doc(collection(db, QUOTATIONS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, QUOTATION_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    // 1. Read customer
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error(`Customer with ID "${customerId}" not found.`);
    }
    const customer = customerSnap.data() as Customer;

    // 2. Increment sequential counter
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const quotationCode = `QUO-${String(nextCount).padStart(6, '0')}`;

    // 3. Process line items and compute totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems: {
      itemRef: ReturnType<typeof doc>;
      data: Omit<QuotationItem, 'id'>;
    }[] = [];

    for (const itemInput of input.items) {
      const qty = Number(itemInput.quantity);
      const unitPrice = Number(itemInput.unitPrice);
      const taxRate = Number(itemInput.taxRate || 0);

      const lineSubtotal = Number((qty * unitPrice).toFixed(2));
      const taxAmount = Number((lineSubtotal * (taxRate / 100)).toFixed(2));
      const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

      subtotal = Number((subtotal + lineSubtotal).toFixed(2));
      totalTax = Number((totalTax + taxAmount).toFixed(2));

      const itemRef = doc(collection(db, QUOTATION_ITEMS_COLLECTION));
      processedItems.push({
        itemRef,
        data: {
          quotationId: quotationRef.id,
          productId: itemInput.productId?.trim() || '',
          productCodeSnapshot: '',
          productNameSnapshot: itemInput.productName.trim(),
          description: itemInput.description?.trim() || '',
          quantity: qty,
          unit: itemInput.unit.trim(),
          unitPrice,
          taxRate,
          taxAmount,
          lineSubtotal,
          lineTotal,
          createdAt: serverTimestamp() as unknown as Timestamp,
          createdBy: userIdentifier,
        },
      });
    }

    const discountAmount = Number((input.discountAmount || 0).toFixed(2));
    const grandTotal = Number((subtotal + totalTax - discountAmount).toFixed(2));

    // 4. Commit line items
    for (const pItem of processedItems) {
      transaction.set(pItem.itemRef, pItem.data);
    }

    // 5. Commit counter and master quotation
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    const quotationDateTimestamp = input.quotationDate ? Timestamp.fromDate(input.quotationDate) : Timestamp.now();
    const validUntilTimestamp = input.validUntil ? Timestamp.fromDate(input.validUntil) : null;

    const quotationData = {
      quotationCode,
      customerId,
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.name,
      requirementId: input.requirementId?.trim() || '',
      quotationDate: quotationDateTimestamp,
      validUntil: validUntilTimestamp,
      status: 'DRAFT' as const,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      grandTotal,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(quotationRef, quotationData);

    return {
      id: quotationRef.id,
      ...quotationData,
      quotationDate: quotationDateTimestamp,
      validUntil: validUntilTimestamp || undefined,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Quotation;
  });
}

/**
 * Updates quotation status (e.g. DRAFT -> SENT -> ACCEPTED / REJECTED).
 */
export async function updateQuotationStatus(
  id: string,
  newStatus: Quotation['status'],
  userIdentifier: string
): Promise<void> {
  const qRef = doc(db, QUOTATIONS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(qRef);
    if (!snap.exists()) {
      throw new Error('Quotation not found.');
    }

    const q = snap.data() as Quotation;
    if (['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(q.status)) {
      throw new Error(`Quotation is already finalized (${q.status}) and cannot be modified.`);
    }

    transaction.update(qRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });
  });
}

/**
 * Fetches complete quotation details including line items.
 */
export async function getQuotationDetails(
  quotationId: string
): Promise<QuotationDetailsResult | null> {
  const qRef = doc(db, QUOTATIONS_COLLECTION, quotationId);
  const qSnap = await getDoc(qRef);
  if (!qSnap.exists()) return null;

  const quotation = { id: qSnap.id, ...qSnap.data() } as Quotation;

  const itemsQuery = query(
    collection(db, QUOTATION_ITEMS_COLLECTION),
    where('quotationId', '==', quotationId)
  );
  const itemsSnap = await getDocs(itemsQuery);
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as QuotationItem[];

  return {
    quotation,
    items,
  };
}

/**
 * Queries paginated quotations.
 */
export async function getQuotations(
  options: QuotationFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchQuotationsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.customerId && options.customerId !== 'ALL') {
    constraints.push(where('customerId', '==', options.customerId));
  }

  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, QUOTATIONS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Quotation[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Quotation[];

  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (quo) =>
        quo.quotationCode.toLowerCase().includes(queryLower) ||
        quo.customerNameSnapshot.toLowerCase().includes(queryLower)
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
