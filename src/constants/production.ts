import type {
  ProductionArea,
  ProductionStatus,
} from '../services/production/productionTypes.ts';

export const PRODUCTION_AREAS: readonly {
  value: ProductionArea;
  label: string;
  description: string;
}[] = [
  {
    value: 'GROUND_FLOOR',
    label: 'Ground Floor',
    description: 'Large Filters Assembly',
  },
  {
    value: 'SECOND_FLOOR',
    label: '2nd Floor',
    description: 'Mini Filters Assembly',
  },
] as const;

export function getProductionAreaLabel(area: ProductionArea): string {
  const found = PRODUCTION_AREAS.find((a) => a.value === area);
  return found ? found.label : area;
}

export const PRODUCTION_STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  COMPLETED: {
    label: 'Completed',
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
