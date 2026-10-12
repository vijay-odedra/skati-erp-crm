import React from 'react';
import { RefreshCw, Calendar, LayoutDashboard } from 'lucide-react';
import type { DashboardDateRange } from '../../services/dashboard/dashboardTypes.ts';
import { ROLE_LABELS } from '../../constants/permissions.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface DashboardHeaderProps {
  dateRange: DashboardDateRange;
  onDateRangeChange: (range: DashboardDateRange) => void;
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: Date;
}

const DATE_RANGE_OPTIONS: { id: DashboardDateRange; label: string }[] = [
  { id: 'TODAY', label: 'Today' },
  { id: '7_DAYS', label: '7 Days' },
  { id: '30_DAYS', label: '30 Days' },
  { id: 'THIS_MONTH', label: 'This Month' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dateRange,
  onDateRangeChange,
  onRefresh,
  loading,
  lastUpdated,
}) => {
  const { profile } = useAuth();
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : 'Operations';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '1px solid #D9EAF0',
      }}
    >
      {/* Title & Role Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#E0F2FE',
            color: '#087EA4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LayoutDashboard size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0F2942' }}>
              {roleLabel} Dashboard
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#E0F2FE',
                color: '#075985',
                border: '1px solid #BFDBFE',
              }}
            >
              LIVE ANALYTICS
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
            SKATI Filtration Manufacturing Operations
            {lastUpdated && ` • Updated at ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
      </div>

      {/* Date Range Selector & Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Period Selector Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #D9EAF0',
            padding: '3px',
          }}
        >
          <div style={{ padding: '0 8px', color: '#64748B', display: 'flex', alignItems: 'center' }}>
            <Calendar size={14} />
          </div>
          {DATE_RANGE_OPTIONS.map((opt) => {
            const isSelected = dateRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onDateRangeChange(opt.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isSelected ? '#087EA4' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Manual Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh dashboard metrics"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #D9EAF0',
            backgroundColor: '#FFFFFF',
            color: '#0F2942',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} color="#087EA4" />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );
};
