import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type { UserRole } from '../../types/auth.ts';
import type { DashboardDateRange, DateRangeBounds } from './dashboardTypes.ts';
import type { RawMaterial } from '../inventory/inventoryTypes.ts';
import type { FinishedProductStock, Production } from '../production/productionTypes.ts';
import type { Order, Dispatch, Payment } from '../orders/orderTypes.ts';
import type { Lead, FollowUp, Quotation, Customer } from '../crm/crmTypes.ts';

// Helper to compute date bounds
export function getDateRangeBounds(
  range: DashboardDateRange,
  customStart?: Date,
  customEnd?: Date
): DateRangeBounds {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (range === 'CUSTOM' && customStart) {
    const start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0);
    const customEndDate = customEnd ? new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59, 999) : end;
    return { startDate: start, endDate: customEndDate };
  }

  if (range === 'TODAY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }

  if (range === '7_DAYS') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }

  if (range === '30_DAYS') {
    const start = new Date(now);
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }

  if (range === 'THIS_MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }

  // Default: Today
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return { startDate: start, endDate: end };
}

export interface RawDashboardDatasets {
  rawMaterials: RawMaterial[];
  finishedStock: FinishedProductStock[];
  productions: Production[];
  orders: Order[];
  dispatches: Dispatch[];
  payments: Payment[];
  leads: Lead[];
  followUps: FollowUp[];
  quotations: Quotation[];
  customers: Customer[];
}

/**
 * Alias for fetching role-scoped datasets for today.
 */
export async function fetchRoleScopedDashboardData(role: UserRole): Promise<RawDashboardDatasets> {
  return fetchRawDashboardDatasets(role, 'TODAY');
}

/**
 * Fetches required raw datasets from Firestore based strictly on the user's role and date bounds.
 */
export async function fetchRawDashboardDatasets(
  role: UserRole,
  dateRange: DashboardDateRange,
  customStart?: Date,
  customEnd?: Date
): Promise<RawDashboardDatasets> {
  const { startDate } = getDateRangeBounds(dateRange, customStart, customEnd);
  const startTimestamp = Timestamp.fromDate(startDate);

  // Initialize empty containers
  let rawMaterials: RawMaterial[] = [];
  let finishedStock: FinishedProductStock[] = [];
  let productions: Production[] = [];
  let orders: Order[] = [];
  let dispatches: Dispatch[] = [];
  let payments: Payment[] = [];
  let leads: Lead[] = [];
  let followUps: FollowUp[] = [];
  let quotations: Quotation[] = [];
  let customers: Customer[] = [];

  const promises: Promise<void>[] = [];

  // 1. RAW MATERIALS (Admin, Manager, Purchase, Production)
  if (['admin', 'manager', 'purchase_employee', 'production_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(
            collection(db, 'rawMaterials'),
            where('isActive', '==', true),
            limit(100)
          );
          const snap = await getDocs(q);
          rawMaterials = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RawMaterial[];
        } catch (err) {
          console.warn('Dashboard: Failed to load rawMaterials:', err);
        }
      })()
    );
  }

  // 2. FINISHED PRODUCT STOCK (Admin, Manager, Production, Sales)
  if (['admin', 'manager', 'production_employee', 'sales_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(collection(db, 'finishedProductStock'), limit(100));
          const snap = await getDocs(q);
          finishedStock = snap.docs.map((d) => ({ productId: d.id, ...d.data() })) as FinishedProductStock[];
        } catch (err) {
          console.warn('Dashboard: Failed to load finishedProductStock:', err);
        }
      })()
    );
  }

  // 3. PRODUCTION BATCHES (Admin, Manager, Production)
  if (['admin', 'manager', 'production_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(
            collection(db, 'productions'),
            where('createdAt', '>=', startTimestamp),
            orderBy('createdAt', 'desc'),
            limit(100)
          );
          const snap = await getDocs(q);
          productions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Production[];
        } catch (err) {
          console.warn('Dashboard: Failed to load productions for period:', err);
        }
      })()
    );
  }

  // 4. ORDERS (Admin, Manager, Sales, Production)
  if (['admin', 'manager', 'sales_employee', 'production_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(
            collection(db, 'orders'),
            orderBy('orderDate', 'desc'),
            limit(50)
          );
          const snap = await getDocs(q);
          orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
        } catch (err) {
          console.warn('Dashboard: Failed to load orders:', err);
        }
      })()
    );
  }

  // 5. DISPATCHES (Admin, Manager, Sales)
  if (['admin', 'manager', 'sales_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(
            collection(db, 'dispatches'),
            orderBy('dispatchDate', 'desc'),
            limit(30)
          );
          const snap = await getDocs(q);
          dispatches = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Dispatch[];
        } catch (err) {
          console.warn('Dashboard: Failed to load dispatches:', err);
        }
      })()
    );
  }

  // 6. PAYMENTS (Admin, Manager, Sales)
  if (['admin', 'manager', 'sales_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const q = query(
            collection(db, 'payments'),
            orderBy('paymentDate', 'desc'),
            limit(30)
          );
          const snap = await getDocs(q);
          payments = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[];
        } catch (err) {
          console.warn('Dashboard: Failed to load payments:', err);
        }
      })()
    );
  }

  // 7. CRM LEADS, FOLLOWUPS, QUOTATIONS & CUSTOMERS (Admin, Manager, Sales)
  if (['admin', 'manager', 'sales_employee'].includes(role)) {
    promises.push(
      (async () => {
        try {
          const [leadsSnap, followUpsSnap, quotSnap, custSnap] = await Promise.all([
            getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(30))),
            getDocs(query(collection(db, 'followUps'), where('status', '==', 'PENDING'), limit(50))),
            getDocs(query(collection(db, 'quotations'), orderBy('createdAt', 'desc'), limit(30))),
            getDocs(query(collection(db, 'customers'), where('isActive', '==', true), limit(30))),
          ]);

          leads = leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[];
          followUps = followUpsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as FollowUp[];
          quotations = quotSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Quotation[];
          customers = custSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Customer[];
        } catch (err) {
          console.warn('Dashboard: Failed to load CRM datasets:', err);
        }
      })()
    );
  }

  await Promise.all(promises);

  return {
    rawMaterials,
    finishedStock,
    productions,
    orders,
    dispatches,
    payments,
    leads,
    followUps,
    quotations,
    customers,
  };
}
