import type { UserRole } from '../../types/auth.ts';
import type {
  KpiCardData,
  ProductionSummaryData,
  StockSummaryData,
  OrderSummaryData,
  DispatchSummaryData,
  PaymentSummaryData,
  CrmSummaryData,
  LowStockMaterialItem,
  FinishedProductStockItem,
  ProductProductionMetric,
} from './dashboardTypes.ts';
import type { RawDashboardDatasets } from './dashboardQueries.ts';

/**
 * Derives Production Summary metrics.
 */
export function computeProductionSummary(datasets: RawDashboardDatasets): ProductionSummaryData {
  const completedBatches = datasets.productions.filter((p) => p.status === 'COMPLETED');
  const totalQuantity = completedBatches.reduce((sum, p) => sum + p.quantityProduced, 0);
  const groundFloorQuantity = completedBatches
    .filter((p) => p.productionArea === 'GROUND_FLOOR')
    .reduce((sum, p) => sum + p.quantityProduced, 0);
  const secondFloorQuantity = completedBatches
    .filter((p) => p.productionArea === 'SECOND_FLOOR')
    .reduce((sum, p) => sum + p.quantityProduced, 0);

  // Group by product
  const productMap = new Map<string, ProductProductionMetric>();
  for (const b of completedBatches) {
    const existing = productMap.get(b.productId);
    if (existing) {
      existing.quantity += b.quantityProduced;
    } else {
      productMap.set(b.productId, {
        productId: b.productId,
        productName: b.productNameSnapshot || 'Unknown Product',
        productCode: b.productCodeSnapshot || '',
        quantity: b.quantityProduced,
        unit: b.productUnitSnapshot || 'piece',
      });
    }
  }

  return {
    totalQuantity,
    groundFloorQuantity,
    secondFloorQuantity,
    batchCount: completedBatches.length,
    productBreakdown: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity),
  };
}

/**
 * Derives Raw Material and Finished Product Stock summary.
 */
export function computeStockSummary(datasets: RawDashboardDatasets): StockSummaryData {
  const lowStockItems: LowStockMaterialItem[] = [];
  let criticalCount = 0;

  for (const m of datasets.rawMaterials) {
    const isLow = m.currentStock <= m.minimumStock;
    const isOut = m.currentStock <= 0;
    if (isOut) criticalCount++;
    if (isLow) {
      lowStockItems.push({
        id: m.id,
        name: m.name,
        materialCode: m.materialCode,
        category: m.category,
        unit: m.unit,
        currentStock: m.currentStock,
        minimumStock: m.minimumStock,
        isOutOfStock: isOut,
      });
    }
  }

  // Sort lowest stock first
  lowStockItems.sort((a, b) => a.currentStock - b.currentStock);

  const finishedProducts: FinishedProductStockItem[] = datasets.finishedStock.map((fs) => ({
    productId: fs.productId,
    productName: fs.productNameSnapshot || 'Product',
    productCode: fs.productCodeSnapshot || '',
    unit: fs.unit || 'piece',
    category: '',
    currentStock: fs.currentStock || 0,
  }));

  const availableFinishedCount = finishedProducts.filter((p) => p.currentStock > 0).length;
  const lowFinishedCount = finishedProducts.filter((p) => p.currentStock <= 0).length;

  return {
    activeMaterialsCount: datasets.rawMaterials.length,
    lowStockMaterialsCount: lowStockItems.length,
    criticalStockMaterialsCount: criticalCount,
    lowStockItems,
    availableFinishedProductsCount: availableFinishedCount,
    lowFinishedProductsCount: lowFinishedCount,
    finishedProducts,
  };
}

/**
 * Derives Commercial Order metrics.
 */
export function computeOrderSummary(datasets: RawDashboardDatasets): OrderSummaryData {
  const orders = datasets.orders;
  const nowMs = Date.now();

  let pendingCount = 0;
  let inProdCount = 0;
  let readyCount = 0;
  let partialDispCount = 0;
  let dispCount = 0;
  let completedCount = 0;
  let overdueCount = 0;

  for (const o of orders) {
    if (['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH'].includes(o.status)) {
      pendingCount++;
    }
    if (o.status === 'IN_PRODUCTION') inProdCount++;
    if (o.status === 'READY_TO_DISPATCH') readyCount++;
    if (o.status === 'PARTIALLY_DISPATCHED') partialDispCount++;
    if (o.status === 'DISPATCHED') dispCount++;
    if (o.status === 'COMPLETED') completedCount++;

    if (
      o.expectedDeliveryDate?.toMillis &&
      o.expectedDeliveryDate.toMillis() < nowMs &&
      !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)
    ) {
      overdueCount++;
    }
  }

  return {
    pendingOrdersCount: pendingCount,
    inProductionOrdersCount: inProdCount,
    readyToDispatchOrdersCount: readyCount,
    partiallyDispatchedOrdersCount: partialDispCount,
    dispatchedOrdersCount: dispCount,
    completedRecentCount: completedCount,
    overdueOrdersCount: overdueCount,
    recentOrders: orders.slice(0, 6),
  };
}

/**
 * Derives Dispatch metrics.
 */
export function computeDispatchSummary(datasets: RawDashboardDatasets): DispatchSummaryData {
  const dispatches = datasets.dispatches;
  const pendingDispatch = datasets.orders.filter((o) =>
    ['READY_TO_DISPATCH', 'PARTIALLY_DISPATCHED'].includes(o.status)
  ).length;

  const partiallyDispatched = datasets.orders.filter((o) => o.status === 'PARTIALLY_DISPATCHED').length;

  return {
    pendingDispatchCount: pendingDispatch,
    partiallyDispatchedCount: partiallyDispatched,
    dispatchedPeriodCount: dispatches.length,
    recentDispatches: dispatches.slice(0, 5),
  };
}

/**
 * Derives Payment & Receivables metrics.
 */
export function computePaymentSummary(datasets: RawDashboardDatasets): PaymentSummaryData {
  const ordersWithPending = datasets.orders.filter((o) => o.pendingAmount > 0 && o.status !== 'CANCELLED');
  const totalPendingAmount = ordersWithPending.reduce((sum, o) => sum + (o.pendingAmount || 0), 0);
  const totalReceivedPeriod = datasets.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    totalPendingPaymentAmount: Number(totalPendingAmount.toFixed(2)),
    ordersWithPendingPaymentCount: ordersWithPending.length,
    paymentsReceivedPeriodAmount: Number(totalReceivedPeriod.toFixed(2)),
    recentPayments: datasets.payments.slice(0, 5),
  };
}

/**
 * Derives CRM metrics.
 */
export function computeCrmSummary(datasets: RawDashboardDatasets): CrmSummaryData {
  const newLeads = datasets.leads.filter((l) => l.status === 'NEW').length;
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const nowMs = now.getTime();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTodayMs = startOfToday.getTime();

  let followUpsDue = 0;
  let overdueFollowUps = 0;

  for (const f of datasets.followUps) {
    if (f.status === 'PENDING' && f.followUpAt?.toMillis) {
      const scheduledMs = f.followUpAt.toMillis();
      if (scheduledMs <= nowMs) {
        followUpsDue++;
      }
      if (scheduledMs < startTodayMs) {
        overdueFollowUps++;
      }
    }
  }

  const acceptedQuotations = datasets.quotations.filter((q) => q.status === 'ACCEPTED' && !q.acceptedOrderId).length;

  return {
    newLeadsCount: newLeads,
    followUpsDueCount: followUpsDue,
    overdueFollowUpsCount: overdueFollowUps,
    recentQuotationsCount: datasets.quotations.length,
    acceptedQuotationsCount: acceptedQuotations,
    recentCustomers: datasets.customers.slice(0, 5),
  };
}

/**
 * Generates role-tailored KPI Cards from computed metrics.
 */
export function generateRoleKpis(
  role: UserRole,
  prodSummary?: ProductionSummaryData,
  stockSummary?: StockSummaryData,
  orderSummary?: OrderSummaryData,
  dispatchSummary?: DispatchSummaryData,
  paymentSummary?: PaymentSummaryData,
  crmSummary?: CrmSummaryData
): KpiCardData[] {
  const kpis: KpiCardData[] = [];

  // ==========================================
  // 1. ADMIN KPIS
  // ==========================================
  if (role === 'admin') {
    if (prodSummary) {
      kpis.push({
        id: 'kpi-prod',
        label: "Production Output",
        value: prodSummary.totalQuantity,
        unit: 'units',
        format: 'number',
        subtext: `GF: ${prodSummary.groundFloorQuantity} | 2F: ${prodSummary.secondFloorQuantity}`,
        variant: prodSummary.totalQuantity > 0 ? 'success' : 'default',
        actionLink: '/production',
        actionLabel: 'View Production',
      });
    }

    if (stockSummary) {
      kpis.push({
        id: 'kpi-low-stock',
        label: 'Low Stock Raw Materials',
        value: stockSummary.lowStockMaterialsCount,
        format: 'number',
        subtext: stockSummary.criticalStockMaterialsCount > 0
          ? `${stockSummary.criticalStockMaterialsCount} Out of Stock!`
          : 'Materials below threshold',
        variant: stockSummary.criticalStockMaterialsCount > 0
          ? 'danger'
          : stockSummary.lowStockMaterialsCount > 0
          ? 'warning'
          : 'success',
        actionLink: '/raw-materials',
        actionLabel: 'Check Inventory',
      });
    }

    if (orderSummary) {
      kpis.push({
        id: 'kpi-pending-orders',
        label: 'Pending Sales Orders',
        value: orderSummary.pendingOrdersCount,
        format: 'number',
        subtext: orderSummary.overdueOrdersCount > 0
          ? `${orderSummary.overdueOrdersCount} overdue delivery`
          : 'Awaiting fulfillment',
        variant: orderSummary.overdueOrdersCount > 0 ? 'danger' : 'info',
        actionLink: '/sales',
        actionLabel: 'View Orders',
      });
    }

    if (paymentSummary) {
      kpis.push({
        id: 'kpi-pending-payments',
        label: 'Pending Receivables',
        value: paymentSummary.totalPendingPaymentAmount,
        format: 'currency',
        subtext: `${paymentSummary.ordersWithPendingPaymentCount} orders awaiting payment`,
        variant: paymentSummary.totalPendingPaymentAmount > 0 ? 'warning' : 'success',
        actionLink: '/sales',
        actionLabel: 'View Payments',
      });
    }

    if (crmSummary) {
      kpis.push({
        id: 'kpi-crm-followups',
        label: 'Follow-ups Due Today',
        value: crmSummary.followUpsDueCount,
        format: 'number',
        subtext: `${crmSummary.newLeadsCount} new leads`,
        variant: crmSummary.followUpsDueCount > 0 ? 'warning' : 'default',
        actionLink: '/crm',
        actionLabel: 'Open CRM',
      });
    }
  }

  // ==========================================
  // 2. MANAGER KPIS
  // ==========================================
  if (role === 'manager') {
    if (prodSummary) {
      kpis.push({
        id: 'kpi-prod',
        label: "Production Output",
        value: prodSummary.totalQuantity,
        unit: 'units',
        format: 'number',
        subtext: `GF: ${prodSummary.groundFloorQuantity} | 2F: ${prodSummary.secondFloorQuantity}`,
        variant: 'success',
        actionLink: '/production',
        actionLabel: 'View Batches',
      });
    }

    if (stockSummary) {
      kpis.push({
        id: 'kpi-low-stock',
        label: 'Low Stock Alert',
        value: stockSummary.lowStockMaterialsCount,
        format: 'number',
        subtext: `${stockSummary.criticalStockMaterialsCount} critical out of stock`,
        variant: stockSummary.criticalStockMaterialsCount > 0 ? 'danger' : 'warning',
        actionLink: '/raw-materials',
      });
    }

    if (orderSummary) {
      kpis.push({
        id: 'kpi-orders',
        label: 'Pending Orders',
        value: orderSummary.pendingOrdersCount,
        format: 'number',
        subtext: `${orderSummary.inProductionOrdersCount} in production, ${orderSummary.readyToDispatchOrdersCount} ready`,
        variant: 'info',
        actionLink: '/sales',
      });
    }

    if (dispatchSummary) {
      kpis.push({
        id: 'kpi-dispatch',
        label: 'Pending Dispatch',
        value: dispatchSummary.pendingDispatchCount,
        format: 'number',
        subtext: `${dispatchSummary.partiallyDispatchedCount} partially dispatched`,
        variant: 'warning',
        actionLink: '/sales',
      });
    }

    if (paymentSummary) {
      kpis.push({
        id: 'kpi-payments',
        label: 'Pending Balance',
        value: paymentSummary.totalPendingPaymentAmount,
        format: 'currency',
        subtext: `${paymentSummary.ordersWithPendingPaymentCount} orders pending payment`,
        variant: 'default',
        actionLink: '/sales',
      });
    }
  }

  // ==========================================
  // 3. PRODUCTION EMPLOYEE KPIS
  // ==========================================
  if (role === 'production_employee') {
    if (prodSummary) {
      kpis.push({
        id: 'kpi-total-prod',
        label: "Total Units Produced",
        value: prodSummary.totalQuantity,
        unit: 'units',
        format: 'number',
        subtext: `${prodSummary.batchCount} batch(es) completed`,
        variant: 'success',
        actionLink: '/production',
        actionLabel: 'Log Production',
      });

      kpis.push({
        id: 'kpi-gf-prod',
        label: 'Ground Floor Production',
        value: prodSummary.groundFloorQuantity,
        unit: 'units',
        format: 'number',
        variant: 'info',
      });

      kpis.push({
        id: 'kpi-2f-prod',
        label: 'Second Floor Production',
        value: prodSummary.secondFloorQuantity,
        unit: 'units',
        format: 'number',
        variant: 'info',
      });
    }

    if (orderSummary) {
      kpis.push({
        id: 'kpi-prod-queue',
        label: 'Orders in Production',
        value: orderSummary.inProductionOrdersCount + orderSummary.pendingOrdersCount,
        format: 'number',
        subtext: 'Scheduled production backlog',
        variant: 'warning',
      });
    }

    if (stockSummary) {
      kpis.push({
        id: 'kpi-finished-avail',
        label: 'Available Finished Goods',
        value: stockSummary.availableFinishedProductsCount,
        unit: 'SKUs',
        format: 'number',
        subtext: `${stockSummary.lowFinishedProductsCount} SKUs out of stock`,
        variant: 'default',
      });
    }
  }

  // ==========================================
  // 4. PURCHASE EMPLOYEE KPIS
  // ==========================================
  if (role === 'purchase_employee') {
    if (stockSummary) {
      kpis.push({
        id: 'kpi-low-mat',
        label: 'Low Stock Raw Materials',
        value: stockSummary.lowStockMaterialsCount,
        format: 'number',
        subtext: 'Items below minimum stock threshold',
        variant: stockSummary.lowStockMaterialsCount > 0 ? 'warning' : 'success',
        actionLink: '/raw-materials',
        actionLabel: 'View Raw Materials',
      });

      kpis.push({
        id: 'kpi-crit-mat',
        label: 'Critical / Out of Stock',
        value: stockSummary.criticalStockMaterialsCount,
        format: 'number',
        subtext: 'Requires immediate PO placement',
        variant: stockSummary.criticalStockMaterialsCount > 0 ? 'danger' : 'success',
        actionLink: '/purchases',
        actionLabel: 'Create Purchase',
      });

      kpis.push({
        id: 'kpi-active-mat',
        label: 'Active Raw Materials',
        value: stockSummary.activeMaterialsCount,
        unit: 'items',
        format: 'number',
        subtext: 'Cataloged raw materials',
        variant: 'default',
        actionLink: '/raw-materials',
      });
    }
  }

  // ==========================================
  // 5. SALES EMPLOYEE KPIS
  // ==========================================
  if (role === 'sales_employee') {
    if (crmSummary) {
      kpis.push({
        id: 'kpi-followups',
        label: 'Follow-ups Due Today',
        value: crmSummary.followUpsDueCount,
        format: 'number',
        subtext: `${crmSummary.overdueFollowUpsCount} overdue inquiries`,
        variant: crmSummary.followUpsDueCount > 0 ? 'warning' : 'success',
        actionLink: '/crm',
        actionLabel: 'Open CRM',
      });

      kpis.push({
        id: 'kpi-new-leads',
        label: 'New Uncontacted Leads',
        value: crmSummary.newLeadsCount,
        format: 'number',
        subtext: 'Fresh lead inquiries',
        variant: 'info',
        actionLink: '/crm',
      });
    }

    if (orderSummary) {
      kpis.push({
        id: 'kpi-active-orders',
        label: 'Active Sales Orders',
        value: orderSummary.pendingOrdersCount,
        format: 'number',
        subtext: `${orderSummary.readyToDispatchOrdersCount} ready for dispatch`,
        variant: 'default',
        actionLink: '/sales',
        actionLabel: 'View Orders',
      });
    }

    if (dispatchSummary) {
      kpis.push({
        id: 'kpi-pending-disp',
        label: 'Ready for Dispatch',
        value: dispatchSummary.pendingDispatchCount,
        format: 'number',
        subtext: 'Goods packaged awaiting shipment',
        variant: 'info',
        actionLink: '/sales',
      });
    }

    if (paymentSummary) {
      kpis.push({
        id: 'kpi-receivables',
        label: 'Pending Customer Receivables',
        value: paymentSummary.totalPendingPaymentAmount,
        format: 'currency',
        subtext: `${paymentSummary.ordersWithPendingPaymentCount} orders with balance`,
        variant: 'warning',
        actionLink: '/sales',
      });
    }
  }

  return kpis;
}
