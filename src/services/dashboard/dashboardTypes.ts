import type { Timestamp } from 'firebase/firestore';
import type { UserRole } from '../../types/auth.ts';
import type { Order, Dispatch, Payment } from '../orders/orderTypes.ts';
import type { Customer } from '../crm/crmTypes.ts';

// ==========================================
// 1. DATE RANGE DEFINITIONS
// ==========================================

export type DashboardDateRange = 'TODAY' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

export interface DateRangeBounds {
  startDate: Date;
  endDate: Date;
}

// ==========================================
// 2. KPI CARD DEFINITIONS
// ==========================================

export type KpiVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface KpiCardData {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  format?: 'number' | 'currency' | 'text';
  subtext?: string;
  variant?: KpiVariant;
  actionLink?: string;
  actionLabel?: string;
}

// ==========================================
// 3. PRODUCTION SUMMARY DATA
// ==========================================

export interface ProductProductionMetric {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unit: string;
}

export interface ProductionSummaryData {
  totalQuantity: number;
  groundFloorQuantity: number;
  secondFloorQuantity: number;
  batchCount: number;
  productBreakdown: ProductProductionMetric[];
}

// ==========================================
// 4. STOCK SUMMARY DATA
// ==========================================

export interface LowStockMaterialItem {
  id: string;
  name: string;
  materialCode: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  isOutOfStock: boolean;
}

export interface FinishedProductStockItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  category: string;
  currentStock: number;
}

export interface StockSummaryData {
  activeMaterialsCount: number;
  lowStockMaterialsCount: number;
  criticalStockMaterialsCount: number;
  lowStockItems: LowStockMaterialItem[];
  availableFinishedProductsCount: number;
  lowFinishedProductsCount: number;
  finishedProducts: FinishedProductStockItem[];
}

// ==========================================
// 5. ORDER SUMMARY DATA
// ==========================================

export interface OrderSummaryData {
  pendingOrdersCount: number;
  inProductionOrdersCount: number;
  readyToDispatchOrdersCount: number;
  partiallyDispatchedOrdersCount: number;
  dispatchedOrdersCount: number;
  completedRecentCount: number;
  overdueOrdersCount: number;
  recentOrders: Order[];
}

// ==========================================
// 6. DISPATCH SUMMARY DATA
// ==========================================

export interface DispatchSummaryData {
  pendingDispatchCount: number;
  partiallyDispatchedCount: number;
  dispatchedPeriodCount: number;
  recentDispatches: Dispatch[];
}

// ==========================================
// 7. PAYMENT SUMMARY DATA
// ==========================================

export interface PaymentSummaryData {
  totalPendingPaymentAmount: number;
  ordersWithPendingPaymentCount: number;
  paymentsReceivedPeriodAmount: number;
  recentPayments: Payment[];
}

// ==========================================
// 8. CRM SUMMARY DATA
// ==========================================

export interface CrmSummaryData {
  newLeadsCount: number;
  followUpsDueCount: number;
  overdueFollowUpsCount: number;
  recentQuotationsCount: number;
  acceptedQuotationsCount: number;
  recentCustomers: Customer[];
}

// ==========================================
// 9. ALERT SYSTEM MODEL
// ==========================================

export type AlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'FOLLOW_UP_DUE'
  | 'ORDER_OVERDUE'
  | 'PENDING_DISPATCH'
  | 'PENDING_PAYMENT'
  | 'PRODUCTION';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  targetPath?: string;
  actionLabel?: string;
  createdAt?: Timestamp;
}

// ==========================================
// 10. COMPOUND DASHBOARD PAYLOAD
// ==========================================

export interface DashboardData {
  role: UserRole;
  dateRange: DashboardDateRange;
  lastUpdated: Date;
  kpis: KpiCardData[];
  production?: ProductionSummaryData;
  stock?: StockSummaryData;
  orders?: OrderSummaryData;
  dispatches?: DispatchSummaryData;
  payments?: PaymentSummaryData;
  crm?: CrmSummaryData;
  alerts: DashboardAlert[];
}
