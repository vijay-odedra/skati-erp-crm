import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Order,
  CreateOrderInput,
  OrderStatus,
} from './orderTypes.ts';
import type { Customer, Quotation, QuotationItem } from '../crm/crmTypes.ts';
import type { Product } from '../products/productTypes.ts';

const ORDERS_COLLECTION = 'orders';
const ORDER_ITEMS_COLLECTION = 'orderItems';
const CUSTOMERS_COLLECTION = 'customers';
const PRODUCTS_COLLECTION = 'products';
const QUOTATIONS_COLLECTION = 'quotations';
const QUOTATION_ITEMS_COLLECTION = 'quotationItems';
const COUNTERS_COLLECTION = 'counters';
const ORDER_COUNTER_ID = 'orders';

/**
 * Valid state transitions for Sales Orders to prevent illegal jumps.
 */
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'READY_TO_DISPATCH', 'CANCELLED'],
  IN_PRODUCTION: ['READY_TO_DISPATCH', 'PARTIALLY_DISPATCHED', 'CANCELLED'],
  READY_TO_DISPATCH: ['PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED'],
  PARTIALLY_DISPATCHED: ['DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DISPATCHED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Creates a new Sales Order with atomic sequential code generation (ORD-000001).
 */
export async function createOrder(
  input: CreateOrderInput,
  userIdentifier: string
): Promise<Order> {
  const customerId = input.customerId?.trim();
  if (!customerId) {
    throw new Error('Customer ID is required.');
  }

  if (!input.items || input.items.length === 0) {
    throw new Error('At least one order line item is required.');
  }

  // Prevent duplicate product lines in same order
  const productIds = new Set<string>();
  for (const item of input.items) {
    const pId = item.productId?.trim();
    if (!pId) {
      throw new Error('Product ID is required for all order items.');
    }
    if (productIds.has(pId)) {
      throw new Error('Duplicate product lines are not allowed within the same order.');
    }
    productIds.add(pId);

    const orderedQty = Number(item.orderedQuantity);
    if (isNaN(orderedQty) || orderedQty <= 0) {
      throw new Error('Ordered quantity must be greater than zero.');
    }

    const unitPrice = Number(item.unitPrice);
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error('Unit price cannot be negative.');
    }
  }

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const counterRef = doc(db, COUNTERS_COLLECTION, ORDER_COUNTER_ID);
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. READ CUSTOMER
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error(`Customer with ID "${customerId}" does not exist.`);
    }
    const customer = customerSnap.data() as Customer;
    if (!customer.isActive) {
      throw new Error(`Customer "${customer.name}" is inactive.`);
    }

    // 2. READ PRODUCTS & CALCULATE LINE ITEMS
    let subtotal = 0;
    let totalTax = 0;
    const processedItems: {
      itemRef: ReturnType<typeof doc>;
      data: Record<string, unknown>;
    }[] = [];

    for (const itemInput of input.items) {
      const pRef = doc(db, PRODUCTS_COLLECTION, itemInput.productId.trim());
      const pSnap = await transaction.get(pRef);
      if (!pSnap.exists()) {
        throw new Error(`Product with ID "${itemInput.productId}" not found.`);
      }
      const product = pSnap.data() as Product;
      if (!product.isActive) {
        throw new Error(`Product "${product.name}" is inactive.`);
      }

      const orderedQuantity = Number(itemInput.orderedQuantity);
      if (product.unit === 'piece' && !Number.isInteger(orderedQuantity)) {
        throw new Error(`Ordered quantity for "${product.name}" (unit piece) must be a whole integer.`);
      }

      const unitPrice = Number(Number(itemInput.unitPrice).toFixed(2));
      const taxRate = itemInput.taxRate !== undefined ? Number(itemInput.taxRate) : 0;
      const lineSubtotal = Number((orderedQuantity * unitPrice).toFixed(2));
      const taxAmount = Number((lineSubtotal * (taxRate / 100)).toFixed(2));
      const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));

      subtotal = Number((subtotal + lineSubtotal).toFixed(2));
      totalTax = Number((totalTax + taxAmount).toFixed(2));

      const itemRef = doc(collection(db, ORDER_ITEMS_COLLECTION));
      processedItems.push({
        itemRef,
        data: {
          orderId: orderRef.id,
          productId: product.id || itemInput.productId.trim(),
          productCodeSnapshot: product.productCode,
          productNameSnapshot: product.name,
          unit: product.unit,
          orderedQuantity,
          producedQuantity: 0,
          dispatchedQuantity: 0,
          pendingProductionQuantity: orderedQuantity,
          pendingDispatchQuantity: orderedQuantity,
          unitPrice,
          taxRate,
          taxAmount,
          lineSubtotal,
          lineTotal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userIdentifier,
          updatedBy: userIdentifier,
        },
      });
    }

    // 3. READ COUNTER
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const orderCode = `ORD-${String(nextCount).padStart(6, '0')}`;

    const discountAmount = Number((input.discountAmount || 0).toFixed(2));
    const grandTotal = Number((subtotal + totalTax - discountAmount).toFixed(2));

    // ==========================================
    // WRITES
    // ==========================================

    for (const pItem of processedItems) {
      transaction.set(pItem.itemRef, pItem.data);
    }

    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    const orderDateTimestamp = input.orderDate ? Timestamp.fromDate(input.orderDate) : Timestamp.now();
    const expectedDeliveryTimestamp = input.expectedDeliveryDate ? Timestamp.fromDate(input.expectedDeliveryDate) : null;

    const orderData = {
      orderCode,
      customerId,
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.name,
      quotationId: input.quotationId?.trim() || '',
      quotationCodeSnapshot: '',
      orderDate: orderDateTimestamp,
      expectedDeliveryDate: expectedDeliveryTimestamp,
      status: 'CONFIRMED' as OrderStatus,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      grandTotal,
      paidAmount: 0,
      pendingAmount: grandTotal,
      notes: input.notes?.trim() || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(orderRef, orderData);

    return {
      id: orderRef.id,
      ...orderData,
      orderDate: orderDateTimestamp,
      expectedDeliveryDate: expectedDeliveryTimestamp || undefined,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Order;
  });
}

/**
 * Atomically converts an Accepted Commercial Quotation to a Sales Order.
 */
export async function convertQuotationToOrder(
  quotationId: string,
  userIdentifier: string,
  expectedDeliveryDate?: Date
): Promise<Order> {
  const qId = quotationId?.trim();
  if (!qId) {
    throw new Error('Quotation ID is required.');
  }

  // 1. Fetch quotation line items beforehand (getDocs is not supported inside transaction)
  const itemsQuery = query(
    collection(db, QUOTATION_ITEMS_COLLECTION),
    where('quotationId', '==', qId)
  );
  const itemsSnap = await getDocs(itemsQuery);
  if (itemsSnap.empty) {
    throw new Error('Quotation has no line items.');
  }

  const qItems = itemsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as QuotationItem[];

  const quotationRef = doc(db, QUOTATIONS_COLLECTION, qId);
  const counterRef = doc(db, COUNTERS_COLLECTION, ORDER_COUNTER_ID);
  const orderRef = doc(collection(db, ORDERS_COLLECTION));

  return runTransaction(db, async (transaction) => {
    // 1. READ & VALIDATE QUOTATION
    const qSnap = await transaction.get(quotationRef);
    if (!qSnap.exists()) {
      throw new Error(`Quotation with ID "${qId}" not found.`);
    }

    const quotation = qSnap.data() as Quotation;
    if (quotation.acceptedOrderId) {
      throw new Error(
        `Quotation ${quotation.quotationCode} is already converted to Sales Order "${quotation.acceptedOrderCodeSnapshot || quotation.acceptedOrderId}".`
      );
    }

    if (quotation.status === 'REJECTED') {
      throw new Error(`Cannot create Sales Order from a REJECTED quotation.`);
    }

    // 2. READ CUSTOMER
    const customerRef = doc(db, CUSTOMERS_COLLECTION, quotation.customerId);
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error(`Customer with ID "${quotation.customerId}" does not exist.`);
    }
    const customer = customerSnap.data() as Customer;
    if (!customer.isActive) {
      throw new Error(`Customer "${customer.name}" is inactive.`);
    }

    // 3. READ COUNTER FOR ORDER CODE
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const orderCode = `ORD-${String(nextCount).padStart(6, '0')}`;

    // ==========================================
    // WRITES
    // ==========================================

    // Write Order Items
    for (const qItem of qItems) {
      const orderItemRef = doc(collection(db, ORDER_ITEMS_COLLECTION));
      transaction.set(orderItemRef, {
        orderId: orderRef.id,
        productId: qItem.productId,
        productCodeSnapshot: qItem.productCodeSnapshot,
        productNameSnapshot: qItem.productNameSnapshot,
        unit: qItem.unit,
        orderedQuantity: qItem.quantity,
        producedQuantity: 0,
        dispatchedQuantity: 0,
        pendingProductionQuantity: qItem.quantity,
        pendingDispatchQuantity: qItem.quantity,
        unitPrice: qItem.unitPrice,
        taxRate: qItem.taxRate,
        taxAmount: qItem.taxAmount,
        lineSubtotal: qItem.lineSubtotal,
        lineTotal: qItem.lineTotal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userIdentifier,
        updatedBy: userIdentifier,
      });
    }

    // Increment Counter
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });

    // Update Quotation to ACCEPTED & link order
    transaction.update(quotationRef, {
      status: 'ACCEPTED',
      acceptedOrderId: orderRef.id,
      acceptedOrderCodeSnapshot: orderCode,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    const expectedDeliveryTimestamp = expectedDeliveryDate ? Timestamp.fromDate(expectedDeliveryDate) : null;

    // Create Order Record
    const orderData = {
      orderCode,
      customerId: quotation.customerId,
      customerCodeSnapshot: customer.customerCode,
      customerNameSnapshot: customer.name,
      quotationId: qId,
      quotationCodeSnapshot: quotation.quotationCode,
      orderDate: serverTimestamp(),
      expectedDeliveryDate: expectedDeliveryTimestamp,
      status: 'CONFIRMED' as OrderStatus,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discountAmount: quotation.discountAmount,
      grandTotal: quotation.grandTotal,
      paidAmount: 0,
      pendingAmount: quotation.grandTotal,
      notes: quotation.notes || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(orderRef, orderData);

    return {
      id: orderRef.id,
      ...orderData,
      orderDate: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      expectedDeliveryDate: expectedDeliveryTimestamp || undefined,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Order;
  });
}

/**
 * Updates an order's status enforcing controlled lifecycle transitions.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userIdentifier: string
): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists()) {
      throw new Error('Order not found.');
    }

    const currentOrder = snap.data() as Order;
    const currentStatus = currentOrder.status;

    if (currentStatus === newStatus) return;

    const allowedNext = VALID_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowedNext.join(', ') || 'None'}`
      );
    }

    transaction.update(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });
  });
}
