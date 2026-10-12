import type { Timestamp } from 'firebase/firestore';

export type MaterialUnit = 'kg' | 'gram' | 'piece' | 'liter' | 'meter';

export type MaterialCategory =
  | 'Metal'
  | 'Plastic'
  | 'Rubber'
  | 'Filter Media'
  | 'Fastener'
  | 'Packaging'
  | 'Chemical'
  | 'Other';

export type StockStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type StockTransactionType =
  | 'INITIAL'
  | 'PURCHASE'
  | 'USAGE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export type TransactionReferenceType =
  | 'INITIAL_SETUP'
  | 'PURCHASE_ORDER'
  | 'PRODUCTION_BATCH'
  | 'STOCK_COUNT_ADJUSTMENT'
  | 'MANUAL_USAGE';

export interface RawMaterial {
  id: string;
  materialCode: string;
  name: string;
  category: MaterialCategory;
  description: string;
  unit: MaterialUnit;
  currentStock: number;
  minimumStock: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface StockTransaction {
  id: string;
  rawMaterialId: string;
  rawMaterialNameSnapshot: string;
  type: StockTransactionType;
  quantity: number; // Stored as positive quantity
  unit: MaterialUnit;
  referenceType: TransactionReferenceType;
  referenceId?: string;
  reason?: string;
  createdAt: Timestamp;
  createdBy: string; // User email or UID
}

export interface CreateRawMaterialInput {
  name: string;
  category: MaterialCategory;
  description?: string;
  unit: MaterialUnit;
  minimumStock: number;
  initialStock: number;
}

export interface UpdateRawMaterialInput {
  name?: string;
  category?: MaterialCategory;
  description?: string;
  minimumStock?: number;
  isActive?: boolean;
}

export interface RecordUsageInput {
  rawMaterialId: string;
  quantity: number;
  reason?: string;
  referenceId?: string;
}

export interface RecordAdjustmentInput {
  rawMaterialId: string;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  reason: string;
}

export interface RecordPurchaseInput {
  rawMaterialId: string;
  quantity: number;
  referenceId?: string;
  reason?: string;
}

export interface RawMaterialFilterOptions {
  category?: MaterialCategory | 'ALL';
  unit?: MaterialUnit | 'ALL';
  stockStatus?: StockStatus | 'ALL';
  activeStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}
