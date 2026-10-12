import type { Timestamp } from 'firebase/firestore';
import type { MaterialUnit } from '../inventory/inventoryTypes.ts';

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export type PurchaseStatus = 'RECEIVED' | 'CANCELLED';

export interface Purchase {
  id: string;
  purchaseCode: string;
  supplierId: string;
  supplierCodeSnapshot: string;
  supplierNameSnapshot: string;
  purchaseDate: Timestamp;
  invoiceNumber?: string;
  status: PurchaseStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  rawMaterialId: string;
  materialCodeSnapshot: string;
  materialNameSnapshot: string;
  unit: MaterialUnit;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  createdAt: Timestamp;
  createdBy: string;
}

export interface CreateSupplierInput {
  name: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreatePurchaseItemInput {
  rawMaterialId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

export interface CreatePurchaseInput {
  supplierId: string;
  purchaseDate?: Date;
  invoiceNumber?: string;
  items: CreatePurchaseItemInput[];
  discountAmount?: number;
  notes?: string;
}

export interface SupplierFilterOptions {
  searchQuery?: string;
  activeStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  pageSize?: number;
}

export interface PurchaseFilterOptions {
  supplierId?: string | 'ALL';
  status?: PurchaseStatus | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}
