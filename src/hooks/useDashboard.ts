import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth.ts';
import type { DashboardDateRange, DashboardData } from '../services/dashboard/dashboardTypes.ts';
import { fetchRawDashboardDatasets } from '../services/dashboard/dashboardQueries.ts';
import {
  computeProductionSummary,
  computeStockSummary,
  computeOrderSummary,
  computeDispatchSummary,
  computePaymentSummary,
  computeCrmSummary,
  generateRoleKpis,
} from '../services/dashboard/dashboardMetrics.ts';
import { deriveDashboardAlerts } from '../services/dashboard/dashboardAlerts.ts';

export function useDashboard() {
  const { profile } = useAuth();
  const role = profile?.role || 'admin';

  const [dateRange, setDateRange] = useState<DashboardDateRange>('TODAY');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const raw = await fetchRawDashboardDatasets(
        role,
        dateRange,
        customStartDate,
        customEndDate
      );

      if (!isMountedRef.current) return;

      // Compute summaries based on permitted role visibility
      const hasProd = ['admin', 'manager', 'production_employee'].includes(role);
      const hasStock = ['admin', 'manager', 'purchase_employee', 'production_employee', 'sales_employee'].includes(role);
      const hasOrders = ['admin', 'manager', 'sales_employee', 'production_employee'].includes(role);
      const hasDispatches = ['admin', 'manager', 'sales_employee'].includes(role);
      const hasPayments = ['admin', 'manager', 'sales_employee'].includes(role);
      const hasCrm = ['admin', 'manager', 'sales_employee'].includes(role);

      const prodSummary = hasProd ? computeProductionSummary(raw) : undefined;
      const stockSummary = hasStock ? computeStockSummary(raw) : undefined;
      const orderSummary = hasOrders ? computeOrderSummary(raw) : undefined;
      const dispatchSummary = hasDispatches ? computeDispatchSummary(raw) : undefined;
      const paymentSummary = hasPayments ? computePaymentSummary(raw) : undefined;
      const crmSummary = hasCrm ? computeCrmSummary(raw) : undefined;

      const kpis = generateRoleKpis(
        role,
        prodSummary,
        stockSummary,
        orderSummary,
        dispatchSummary,
        paymentSummary,
        crmSummary
      );

      const alerts = deriveDashboardAlerts(role, raw);

      const dashboardPayload: DashboardData = {
        role,
        dateRange,
        lastUpdated: new Date(),
        kpis,
        production: prodSummary,
        stock: stockSummary,
        orders: orderSummary,
        dispatches: dispatchSummary,
        payments: paymentSummary,
        crm: crmSummary,
        alerts,
      };

      setData(dashboardPayload);
    } catch (err: unknown) {
      console.error('Failed to load dashboard:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [role, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSetDateRange = (range: DashboardDateRange, start?: Date, end?: Date) => {
    setDateRange(range);
    if (range === 'CUSTOM') {
      setCustomStartDate(start);
      setCustomEndDate(end);
    } else {
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  return {
    data,
    loading,
    error,
    dateRange,
    setDateRange: handleSetDateRange,
    refresh: loadDashboard,
  };
}
