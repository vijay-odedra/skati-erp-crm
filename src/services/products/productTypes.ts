import type { Timestamp } from 'firebase/firestore';
import type { MaterialUnit } from '../inventory/inventoryTypes.ts';

export type ProductUnit = 'piece' | 'set' | 'kg' | 'liter' | 'meter';

export type ProductCategory =
  | 'Large Filter'
  | 'Mini Filter'
  | 'Industrial Filter'
  | 'Air Filter'
  | 'Water Filter'
  | 'Oil Filter'
  | 'Custom Filter'
  | 'Other';

export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: ProductCategory;
  description: string;
  unit: ProductUnit;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface BomItem {
  id: string;
  productId: string;
  rawMaterialId: string;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  unitSnapshot: MaterialUnit;
  quantityPerProduct: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export type BomStatus = 'COMPLETE' | 'NO_BOM';

export interface CreateProductInput {
  name: string;
  category: ProductCategory;
  description?: string;
  unit: ProductUnit;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  category?: ProductCategory;
  description?: string;
  unit?: ProductUnit;
  isActive?: boolean;
}

export interface AddBomItemInput {
  rawMaterialId: string;
  quantityPerProduct: number;
}

export interface ProductFilterOptions {
  category?: ProductCategory | 'ALL';
  unit?: ProductUnit | 'ALL';
  activeStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  bomStatus?: 'ALL' | 'COMPLETE' | 'NO_BOM';
  searchQuery?: string;
  pageSize?: number;
}
