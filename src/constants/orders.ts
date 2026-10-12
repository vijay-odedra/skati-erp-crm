import type {
  OrderStatus,
  DispatchStatus,
  PaymentStatus,
  PaymentMethod,
} from '../services/orders/orderTypes.ts';

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: '#0369A1',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  IN_PRODUCTION: {
    label: 'In Production',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  READY_TO_DISPATCH: {
    label: 'Ready to Dispatch',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  PARTIALLY_DISPATCHED: {
    label: 'Partially Dispatched',
    color: '#C2410C',
    bgColor: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: '#087EA4',
    bgColor: '#E0F2FE',
    borderColor: '#99F6E4',
  },
  COMPLETED: {
    label: 'Completed',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
};

export const DISPATCH_STATUS_CONFIG: Record<
  DispatchStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  DRAFT: {
    label: 'Draft',
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  READY: {
    label: 'Ready',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  DISPATCHED: {
    label: 'Dispatched',
    color: '#087EA4',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  DELIVERED: {
    label: 'Delivered',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
};

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  RECEIVED: {
    label: 'Received',
    color: '#15803D',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  PENDING: {
    label: 'Pending',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer (NEFT/RTGS/IMPS)',
  UPI: 'UPI / QR Code',
  CHEQUE: 'Cheque / DD',
  CARD: 'Credit / Debit Card',
  OTHER: 'Other',
};
