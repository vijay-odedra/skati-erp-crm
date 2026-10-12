import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  ReportFilterCriteria,
  DailyProductionReportRow,
  MaterialConsumptionReportRow,
  RawMaterialStockReportRow,
  PurchaseReportRow,
  OrderReportRow,
  DispatchReportRow,
  OutstandingPaymentReportRow,
  CrmLeadReportRow,
} from './reportTypes.ts';

function formatDate(val: any): string {
  if (!val) return '—';
  if (typeof val.toDate === 'function') {
    return val.toDate().toLocaleDateString('en-IN');
  }
  if (val instanceof Date) {
    return val.toLocaleDateString('en-IN');
  }
  if (typeof val === 'string') {
    return val;
  }
  return String(val);
}

/**
 * 1. Daily Production Report
 */
export async function generateDailyProductionReport(
  criteria: ReportFilterCriteria
): Promise<DailyProductionReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'productions'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'productions'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const rows: DailyProductionReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.floor) {
      const area = criteria.floor === 'GROUND' ? 'GROUND_FLOOR' : 'SECOND_FLOOR';
      if (d.productionArea !== area) return;
    }
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;

    rows.push({
      batchNumber: d.productionCode || docSnap.id,
      productionDate: formatDate(d.completedAt || d.startedAt || d.createdAt),
      productName: d.productNameSnapshot || '—',
      productCode: d.productCodeSnapshot || '—',
      floor: d.productionArea === 'GROUND_FLOOR' ? 'Ground Floor' : '2nd Floor',
      shift: 'Day Shift',
      quantityProduced: Number(d.quantityProduced) || 0,
      unit: d.productUnitSnapshot || 'piece',
      recordedByName: d.createdBy || 'Staff',
    });
  });

  return rows;
}

/**
 * 2. Material Consumption Report
 */
export async function generateMaterialConsumptionReport(
  criteria: ReportFilterCriteria
): Promise<MaterialConsumptionReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'productionItems'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'productionItems'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const consumptionMap: Record<
    string,
    {
      materialName: string;
      materialCode: string;
      category: string;
      totalQuantityConsumed: number;
      unit: string;
      batchCount: number;
    }
  > = {};

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;

    const key = d.rawMaterialId || d.materialCodeSnapshot || d.materialNameSnapshot;
    if (!key) return;

    if (!consumptionMap[key]) {
      consumptionMap[key] = {
        materialName: d.materialNameSnapshot || '—',
        materialCode: d.materialCodeSnapshot || '—',
        category: 'Raw Material',
        totalQuantityConsumed: 0,
        unit: d.unit || 'kg',
        batchCount: 0,
      };
    }

    consumptionMap[key].totalQuantityConsumed += Number(d.quantityConsumed) || 0;
    consumptionMap[key].batchCount += 1;
  });

  return Object.values(consumptionMap);
}

/**
 * 3. Raw Material Stock Report
 */
export async function generateRawMaterialStockReport(
  criteria: ReportFilterCriteria
): Promise<RawMaterialStockReportRow[]> {
  const maxLimit = criteria.limit || 200;
  const q = query(
    collection(db, 'rawMaterials'),
    where('isActive', '==', true),
    limit(maxLimit)
  );

  const snap = await getDocs(q);
  const rows: RawMaterialStockReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.categoryId && d.category !== criteria.categoryId) return;

    const currentStock = Number(d.currentStock) || 0;
    const minimumStock = Number(d.minimumStock) || 0;

    let stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK' = 'NORMAL';
    if (currentStock <= 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (currentStock <= minimumStock) {
      stockStatus = 'LOW';
    }

    rows.push({
      materialCode: d.materialCode || '—',
      name: d.name || '—',
      category: d.category || '—',
      currentStock,
      minimumStock,
      unit: d.unit || 'units',
      stockStatus,
    });
  });

  return rows;
}

/**
 * 4. Purchase Summary Report
 */
export async function generatePurchaseReport(
  criteria: ReportFilterCriteria
): Promise<PurchaseReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'purchases'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'purchases'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const rows: PurchaseReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;
    if (criteria.supplierId && d.supplierId !== criteria.supplierId) return;

    rows.push({
      purchaseNumber: d.purchaseCode || docSnap.id,
      purchaseDate: formatDate(d.purchaseDate || d.createdAt),
      supplierName: d.supplierNameSnapshot || '—',
      materialName: d.invoiceNumber ? `Inv: ${d.invoiceNumber}` : 'Standard PO',
      quantity: 1,
      unit: 'batch',
      unitPrice: Number(d.grandTotal) || 0,
      totalAmount: Number(d.grandTotal) || 0,
      status: d.status || 'RECEIVED',
    });
  });

  return rows;
}

/**
 * 5. Sales & Orders Report
 */
export async function generateOrdersReport(
  criteria: ReportFilterCriteria
): Promise<OrderReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const rows: OrderReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;
    if (criteria.status && d.status !== criteria.status) return;
    if (criteria.customerId && d.customerId !== criteria.customerId) return;

    const totalAmount = Number(d.grandTotal) || 0;
    const paidAmount = Number(d.paidAmount) || 0;
    const pendingAmount = Number(d.pendingAmount ?? totalAmount - paidAmount) || 0;
    const paymentStatus =
      paidAmount >= totalAmount ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    rows.push({
      orderNumber: d.orderCode || docSnap.id,
      orderDate: formatDate(d.orderDate || d.createdAt),
      customerName: d.customerNameSnapshot || '—',
      totalAmount,
      status: d.status || 'CONFIRMED',
      paymentStatus,
      paidAmount,
      pendingAmount: Math.max(0, pendingAmount),
      deliveryDate: d.expectedDeliveryDate ? formatDate(d.expectedDeliveryDate) : undefined,
    });
  });

  return rows;
}

/**
 * 6. Dispatch & Fulfillment Report
 */
export async function generateDispatchReport(
  criteria: ReportFilterCriteria
): Promise<DispatchReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'dispatches'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'dispatches'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const rows: DispatchReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;

    rows.push({
      dispatchNumber: d.dispatchCode || docSnap.id,
      dispatchDate: formatDate(d.dispatchDate || d.createdAt),
      orderNumber: d.orderCodeSnapshot || '—',
      customerName: d.customerNameSnapshot || '—',
      status: d.status || 'DISPATCHED',
      carrierName: d.transporter,
      trackingNumber: d.trackingNumber,
      itemCount: Number(d.totalQuantity) || 1,
    });
  });

  return rows;
}

/**
 * 7. Accounts Receivable / Outstanding Payments Report
 */
export async function generateOutstandingPaymentsReport(
  criteria: ReportFilterCriteria
): Promise<OutstandingPaymentReportRow[]> {
  const maxLimit = criteria.limit || 100;
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  const snap = await getDocs(q);
  const rows: OutstandingPaymentReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.customerId && d.customerId !== criteria.customerId) return;

    const totalAmount = Number(d.grandTotal) || 0;
    const paidAmount = Number(d.paidAmount) || 0;
    const outstandingBalance = Number(d.pendingAmount ?? totalAmount - paidAmount) || 0;

    if (outstandingBalance <= 0) return;

    const paymentStatus = paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING';

    rows.push({
      orderNumber: d.orderCode || docSnap.id,
      orderDate: formatDate(d.orderDate || d.createdAt),
      customerName: d.customerNameSnapshot || '—',
      totalAmount,
      paidAmount,
      outstandingBalance,
      paymentStatus,
      deliveryDate: d.expectedDeliveryDate ? formatDate(d.expectedDeliveryDate) : undefined,
    });
  });

  return rows;
}

/**
 * 8. CRM Leads & Pipeline Report
 */
export async function generateCrmLeadsReport(
  criteria: ReportFilterCriteria
): Promise<CrmLeadReportRow[]> {
  const maxLimit = criteria.limit || 100;
  let q = query(
    collection(db, 'leads'),
    orderBy('createdAt', 'desc'),
    limit(maxLimit)
  );

  if (criteria.startDate) {
    const startTs = Timestamp.fromDate(criteria.startDate);
    q = query(
      collection(db, 'leads'),
      where('createdAt', '>=', startTs),
      orderBy('createdAt', 'desc'),
      limit(maxLimit)
    );
  }

  const snap = await getDocs(q);
  const rows: CrmLeadReportRow[] = [];

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    if (criteria.endDate && d.createdAt?.toDate && d.createdAt.toDate() > criteria.endDate) return;
    if (criteria.status && d.status !== criteria.status) return;

    rows.push({
      leadNumber: d.leadCode || docSnap.id,
      companyName: d.companyName || '—',
      contactPerson: d.contactPerson || '—',
      phone: d.phone || '—',
      source: d.source || '—',
      status: d.status || 'NEW',
      createdAt: formatDate(d.createdAt),
      nextFollowUpDate: d.nextFollowUpAt ? formatDate(d.nextFollowUpAt) : undefined,
    });
  });

  return rows;
}
