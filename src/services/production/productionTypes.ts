import type { Timestamp } from 'firebase/firestore';
import type { ProductUnit } from '../products/productTypes.ts';
import type { MaterialUnit } from '../inventory/inventoryTypes.ts';

export type ProductionArea = 'GROUND_FLOOR' | 'SECOND_FLOOR';

export type ProductionStatus = 'COMPLETED' | 'CANCELLED';

export interface Production {
  id: string;
  productionCode: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  productUnitSnapshot: ProductUnit;
  productionArea: ProductionArea;
  quantityProduced: number;
  status: ProductionStatus;
  notes?: string;
  startedAt: Timestamp;
  completedAt: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ProductionItem {
  id: string;
  productionId: string;
  rawMaterialId: string;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  unit: MaterialUnit;
  quantityPerProduct: number;
  quantityConsumed: number;
  createdAt: Timestamp;
}

export interface FinishedProductStock {
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  unit: ProductUnit;
  currentStock: number;
  updatedAt: Timestamp;
}

export interface FinishedProductTransaction {
  id: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  type: 'PRODUCTION_IN' | 'DISPATCH_OUT';
  quantity: number;
  unit: ProductUnit;
  referenceType: 'PRODUCTION_BATCH' | 'DISPATCH';
  referenceId: string;
  referenceCodeSnapshot?: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface CreateProductionInput {
  productId: string;
  quantityProduced: number;
  productionArea: ProductionArea;
  notes?: string;
  orderId?: string;
  orderItemId?: string;
}

export interface ProductionMaterialRequirement {
  rawMaterialId: string;
  materialCode: string;
  materialName: string;
  unit: MaterialUnit;
  quantityPerProduct: number;
  requiredQuantity: number;
  availableStock: number;
  isSufficient: boolean;
  shortageQuantity: number;
}

export interface ProductionPreviewResult {
  product: {
    id: string;
    productCode: string;
    name: string;
    unit: ProductUnit;
  };
  quantityProduced: number;
  productionArea: ProductionArea;
  materials: ProductionMaterialRequirement[];
  isAllStockSufficient: boolean;
}

export interface ProductionFilterOptions {
  productionArea?: ProductionArea | 'ALL';
  status?: ProductionStatus | 'ALL';
  productId?: string | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}
