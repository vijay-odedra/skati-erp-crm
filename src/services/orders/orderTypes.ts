import type { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. ORDER STATUS & DOMAIN ENUMS
// ==========================================

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_DISPATCH'
  | 'PARTIALLY_DISPATCHED'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DispatchStatus =
  | 'DRAFT'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CHEQUE'
  | 'CARD'
  | 'OTHER';

export type PaymentStatus = 'RECEIVED' | 'PENDING' | 'CANCELLED';

// ==========================================
// 2. ORDER INTERFACES
// ==========================================

export interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  quotationId?: string;
  quotationCodeSnapshot?: string;
  orderDate: Timestamp;
  expectedDeliveryDate?: Timestamp;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  unit: string;
  orderedQuantity: number;
  producedQuantity: number;
  dispatchedQuantity: number;
  pendingProductionQuantity: number;
  pendingDispatchQuantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface CreateOrderItemInput {
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateOrderInput {
  customerId: string;
  quotationId?: string;
  orderDate?: Date;
  expectedDeliveryDate?: Date;
  items: CreateOrderItemInput[];
  discountAmount?: number;
  notes?: string;
}

export interface OrderFilterOptions {
  status?: OrderStatus | 'ALL';
  customerId?: string | 'ALL';
  searchQuery?: string;
  startDate?: Date;
  endDate?: Date;
  pageSize?: number;
}

// ==========================================
// 3. PRODUCTION LINK INTERFACE
// ==========================================

export interface ProductionOrderLink {
  id: string;
  productionId: string;
  productionCodeSnapshot: string;
  orderId: string;
  orderCodeSnapshot: string;
  orderItemId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  quantityAllocated: number;
  unit: string;
  createdAt: Timestamp;
  createdBy: string;
}

// ==========================================
// 4. DISPATCH INTERFACES
// ==========================================

export interface Dispatch {
  id: string;
  dispatchCode: string;
  orderId: string;
  orderCodeSnapshot: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  dispatchDate: Timestamp;
  deliveryAddress?: string;
  vehicleNumber?: string;
  transporter?: string;
  trackingNumber?: string;
  status: DispatchStatus;
  totalQuantity: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface DispatchItem {
  id: string;
  dispatchId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  unit: string;
  quantity: number;
  createdAt: Timestamp;
  createdBy: string;
}

export interface CreateDispatchItemInput {
  orderItemId: string;
  productId: string;
  quantity: number;
}

export interface CreateDispatchInput {
  orderId: string;
  dispatchDate?: Date;
  deliveryAddress?: string;
  vehicleNumber?: string;
  transporter?: string;
  trackingNumber?: string;
  status?: DispatchStatus;
  items: CreateDispatchItemInput[];
  notes?: string;
}

export interface DispatchFilterOptions {
  orderId?: string | 'ALL';
  customerId?: string | 'ALL';
  status?: DispatchStatus | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

// ==========================================
// 5. PAYMENT INTERFACES
// ==========================================

export interface Payment {
  id: string;
  paymentCode: string;
  orderId: string;
  orderCodeSnapshot: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  paymentDate: Timestamp;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface RecordPaymentInput {
  orderId: string;
  paymentDate?: Date;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentFilterOptions {
  orderId?: string | 'ALL';
  customerId?: string | 'ALL';
  status?: PaymentStatus | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

// ==========================================
// 6. COMPOUND DETAILS INTERFACES
// ==========================================

export interface OrderDetailsResult {
  order: Order;
  items: OrderItem[];
  dispatches: Dispatch[];
  payments: Payment[];
  productionLinks: ProductionOrderLink[];
}

export interface DispatchDetailsResult {
  dispatch: Dispatch;
  items: DispatchItem[];
}
