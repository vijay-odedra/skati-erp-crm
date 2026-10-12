export type ReportCategory =
  | 'PRODUCTION_DAILY'
  | 'MATERIAL_CONSUMPTION'
  | 'RAW_MATERIAL_STOCK'
  | 'PURCHASE_SUMMARY'
  | 'SALES_ORDERS'
  | 'DISPATCH_LOG'
  | 'OUTSTANDING_PAYMENTS'
  | 'CRM_LEADS_PIPELINE';

export interface ReportFilterCriteria {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  floor?: 'GROUND' | 'SECOND';
  supplierId?: string;
  customerId?: string;
  categoryId?: string;
  limit?: number;
}

export interface DailyProductionReportRow {
  batchNumber: string;
  productionDate: string;
  productName: string;
  productCode: string;
  floor: string;
  shift: string;
  quantityProduced: number;
  unit: string;
  recordedByName: string;
}

export interface MaterialConsumptionReportRow {
  materialName: string;
  materialCode: string;
  category: string;
  totalQuantityConsumed: number;
  unit: string;
  batchCount: number;
}

export interface RawMaterialStockReportRow {
  materialCode: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  unit: string;
  stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK';
}

export interface PurchaseReportRow {
  purchaseNumber: string;
  purchaseDate: string;
  supplierName: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
}

export interface OrderReportRow {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAmount: number;
  pendingAmount: number;
  deliveryDate?: string;
}

export interface DispatchReportRow {
  dispatchNumber: string;
  dispatchDate: string;
  orderNumber: string;
  customerName: string;
  status: string;
  carrierName?: string;
  trackingNumber?: string;
  itemCount: number;
}

export interface OutstandingPaymentReportRow {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentStatus: string;
  deliveryDate?: string;
}

export interface CrmLeadReportRow {
  leadNumber: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  source: string;
  status: string;
  createdAt: string;
  nextFollowUpDate?: string;
}
