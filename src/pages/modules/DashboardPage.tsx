import React from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { useDashboard } from '../../hooks/useDashboard.ts';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader.tsx';
import { KpiSummary } from '../../components/dashboard/KpiSummary.tsx';
import { AlertsPanel } from '../../components/dashboard/AlertsPanel.tsx';
import { ProductionSummary } from '../../components/dashboard/ProductionSummary.tsx';
import { StockSummary } from '../../components/dashboard/StockSummary.tsx';
import { OrderSummary } from '../../components/dashboard/OrderSummary.tsx';
import { PaymentSummary } from '../../components/dashboard/PaymentSummary.tsx';
import { CrmSummary } from '../../components/dashboard/CrmSummary.tsx';

export const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const {
    data,
    loading,
    error,
    dateRange,
    setDateRange,
    refresh,
  } = useDashboard();

  if (loading && !data) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          gap: '12px',
        }}
      >
        <Loader2 size={36} color="#087EA4" style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#64748B' }}>
          Loading live operational dashboard...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '40px auto',
        }}
      >
        <AlertCircle size={40} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#991B1B', margin: '0 0 8px 0' }}>
          Unable to Load Dashboard
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>{error}</p>
        <button
          onClick={refresh}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#087EA4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const role = profile?.role || 'sales_employee';
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const isProductionRole = role === 'production_employee';
  const isPurchaseRole = role === 'purchase_employee';
  const isSalesRole = role === 'sales_employee';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header with Controls */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={refresh}
        loading={loading}
        lastUpdated={data?.lastUpdated}
      />

      {/* 2. Top-level KPI Summary Cards */}
      {data?.kpis && data.kpis.length > 0 && <KpiSummary kpis={data.kpis} />}

      {/* 3. Alerts Panel (Action items) */}
      {data?.alerts && <AlertsPanel alerts={data.alerts} />}

      {/* 4. Modular Dashboard Views by Role */}

      {/* ADMIN & MANAGER: Full overview */}
      {isAdminOrManager && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '20px',
            }}
          >
            <ProductionSummary data={data?.production} />
            <StockSummary data={data?.stock} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '20px',
            }}
          >
            <OrderSummary data={data?.orders} />
            <PaymentSummary data={data?.payments} />
          </div>

          <div>
            <CrmSummary data={data?.crm} />
          </div>
        </>
      )}

      {/* PRODUCTION EMPLOYEE: Production metrics & stock levels */}
      {isProductionRole && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '20px',
          }}
        >
          <ProductionSummary data={data?.production} />
          <StockSummary data={data?.stock} />
        </div>
      )}

      {/* PURCHASE EMPLOYEE: Raw materials, low stock, suppliers overview */}
      {isPurchaseRole && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '20px',
          }}
        >
          <StockSummary data={data?.stock} />
          <OrderSummary data={data?.orders} />
        </div>
      )}

      {/* SALES EMPLOYEE: CRM pipeline, orders, and stock availability */}
      {isSalesRole && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
              gap: '20px',
            }}
          >
            <CrmSummary data={data?.crm} />
            <OrderSummary data={data?.orders} />
          </div>
          <div>
            <StockSummary data={data?.stock} />
          </div>
        </>
      )}
    </div>
  );
};
