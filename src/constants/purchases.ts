import type { PurchaseStatus } from '../services/purchases/purchaseTypes.ts';

export const TAX_RATES: readonly { value: number; label: string }[] = [
  { value: 0, label: '0% (Exempt)' },
  { value: 5, label: '5% GST' },
  { value: 12, label: '12% GST' },
  { value: 18, label: '18% GST' },
  { value: 28, label: '28% GST' },
] as const;

export const PURCHASE_STATUS_CONFIG: Record<
  PurchaseStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  RECEIVED: {
    label: 'Received',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
};
