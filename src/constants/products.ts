import type {
  ProductUnit,
  ProductCategory,
  BomStatus,
} from '../services/products/productTypes.ts';

export const PRODUCT_UNITS: readonly { value: ProductUnit; label: string }[] = [
  { value: 'piece', label: 'Piece' },
  { value: 'set', label: 'Set' },
  { value: 'kg', label: 'Kg' },
  { value: 'liter', label: 'Liter' },
  { value: 'meter', label: 'Meter' },
] as const;

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'Large Filter',
  'Mini Filter',
  'Industrial Filter',
  'Air Filter',
  'Water Filter',
  'Oil Filter',
  'Custom Filter',
  'Other',
] as const;

export function getProductUnitLabel(unit: ProductUnit): string {
  const found = PRODUCT_UNITS.find((u) => u.value === unit);
  return found ? found.label : unit;
}

export const BOM_STATUS_CONFIG: Record<
  BomStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  COMPLETE: {
    label: 'Complete',
    color: '#16A34A',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  NO_BOM: {
    label: 'No BOM',
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
};
