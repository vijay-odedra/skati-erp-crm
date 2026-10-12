import type { UserRole } from '../../types/auth.ts';
import type { DashboardAlert } from './dashboardTypes.ts';
import type { RawDashboardDatasets } from './dashboardQueries.ts';

/**
 * Derives actionable real-time operational alerts from raw authoritative data.
 */
export function deriveDashboardAlerts(
  role: UserRole,
  datasets: RawDashboardDatasets
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const nowMs = Date.now();

  // 1. OUT OF STOCK RAW MATERIALS (Admin, Manager, Purchase)
  if (['admin', 'manager', 'purchase_employee'].includes(role)) {
    const outOfStock = datasets.rawMaterials.filter((m) => m.currentStock <= 0);
    for (const m of outOfStock.slice(0, 3)) {
      alerts.push({
        id: `alert-oos-${m.id}`,
        type: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        title: `Out of Stock: ${m.name}`,
        message: `Material ${m.materialCode} stock is 0 ${m.unit}. Place a purchase order immediately.`,
        targetPath: '/purchases',
        actionLabel: 'Create PO',
      });
    }
  }

  // 2. LOW STOCK RAW MATERIALS (Admin, Manager, Purchase, Production)
  if (['admin', 'manager', 'purchase_employee', 'production_employee'].includes(role)) {
    const lowStock = datasets.rawMaterials.filter(
      (m) => m.currentStock > 0 && m.currentStock <= m.minimumStock
    );
    if (lowStock.length > 0) {
      alerts.push({
        id: 'alert-low-stock-summary',
        type: 'LOW_STOCK',
        severity: 'WARNING',
        title: `${lowStock.length} Raw Materials Below Minimum Stock`,
        message: `Items like ${lowStock.slice(0, 2).map((m) => m.name).join(', ')} require replenishment.`,
        targetPath: '/raw-materials',
        actionLabel: 'View Materials',
      });
    }
  }

  // 3. OVERDUE SALES ORDERS (Admin, Manager, Sales)
  if (['admin', 'manager', 'sales_employee'].includes(role)) {
    const overdueOrders = datasets.orders.filter(
      (o) =>
        o.expectedDeliveryDate?.toMillis &&
        o.expectedDeliveryDate.toMillis() < nowMs &&
        !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)
    );

    for (const o of overdueOrders.slice(0, 3)) {
      alerts.push({
        id: `alert-overdue-${o.id}`,
        type: 'ORDER_OVERDUE',
        severity: 'CRITICAL',
        title: `Order Overdue: ${o.orderCode}`,
        message: `Delivery for ${o.customerNameSnapshot} was due on ${o.expectedDeliveryDate?.toDate ? o.expectedDeliveryDate.toDate().toLocaleDateString() : 'earlier'}.`,
        targetPath: '/sales',
        actionLabel: 'Inspect Order',
      });
    }
  }

  // 4. CRM FOLLOW-UPS DUE TODAY (Admin, Manager, Sales)
  if (['admin', 'manager', 'sales_employee'].includes(role)) {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndMs = todayEnd.getTime();

    const dueFollowUps = datasets.followUps.filter(
      (f) =>
        f.status === 'PENDING' &&
        f.followUpAt?.toMillis &&
        f.followUpAt.toMillis() <= todayEndMs
    );

    if (dueFollowUps.length > 0) {
      alerts.push({
        id: 'alert-followups-due',
        type: 'FOLLOW_UP_DUE',
        severity: 'WARNING',
        title: `${dueFollowUps.length} CRM Follow-ups Scheduled for Today`,
        message: `Client communications pending response today.`,
        targetPath: '/crm',
        actionLabel: 'Open CRM',
      });
    }
  }

  // 5. READY TO DISPATCH (Admin, Manager, Sales, Production)
  if (['admin', 'manager', 'sales_employee', 'production_employee'].includes(role)) {
    const readyOrders = datasets.orders.filter((o) => o.status === 'READY_TO_DISPATCH');
    if (readyOrders.length > 0) {
      alerts.push({
        id: 'alert-ready-dispatch',
        type: 'PENDING_DISPATCH',
        severity: 'INFO',
        title: `${readyOrders.length} Order(s) Ready for Dispatch`,
        message: `Manufactured goods ready for logistics and gate pass generation.`,
        targetPath: '/sales',
        actionLabel: 'Create Dispatch',
      });
    }
  }

  return alerts;
}
