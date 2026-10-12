import type {
  MaterialUnit,
  MaterialCategory,
  StockStatus,
  StockTransactionType,
} from '../services/inventory/inventoryTypes.ts';

export const MATERIAL_UNITS: readonly { value: MaterialUnit; label: string }[] = [
  { value: 'kg', label: 'Kg' },
  { value: 'gram', label: 'Gram' },
  { value: 'piece', label: 'Piece' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
] as const;

export const MATERIAL_CATEGORIES: readonly MaterialCategory[] = [
  'Filter Media',
  'Metal',
  'Plastic',
  'Rubber',
  'Fastener',
  'Packaging',
  'Chemical',
  'Other',
] as const;

export function getUnitLabel(unit: MaterialUnit): string {
  const found = MATERIAL_UNITS.find((u) => u.value === unit);
  return found ? found.label : unit;
}

export function calculateStockStatus(
  currentStock: number,
  minimumStock: number
): StockStatus {
  if (currentStock <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (currentStock <= minimumStock) {
    return 'LOW_STOCK';
  }
  return 'NORMAL';
}

export const STOCK_STATUS_CONFIG: Record<
  StockStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  NORMAL: {
    label: 'Normal',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  LOW_STOCK: {
    label: 'Low Stock',
    color: '#D97706',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    color: '#DC2626',
    bgColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
};

export const TRANSACTION_TYPE_LABELS: Record<
  StockTransactionType,
  { label: string; isCredit: boolean }
> = {
  INITIAL: { label: 'Initial Stock', isCredit: true },
  PURCHASE: { label: 'Purchase Inward', isCredit: true },
  USAGE: { label: 'Production Usage', isCredit: false },
  ADJUSTMENT_IN: { label: 'Stock Adjustment (In)', isCredit: true },
  ADJUSTMENT_OUT: { label: 'Stock Adjustment (Out)', isCredit: false },
};
