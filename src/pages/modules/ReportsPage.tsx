import React, { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart,
  Download,
  Calendar,
  Filter,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import {
  generateDailyProductionReport,
  generateMaterialConsumptionReport,
  generateRawMaterialStockReport,
  generatePurchaseReport,
  generateOrdersReport,
  generateDispatchReport,
  generateOutstandingPaymentsReport,
  generateCrmLeadsReport,
} from '../../services/reports/reportServices.ts';
import type { ReportCategory } from '../../services/reports/reportTypes.ts';

const REPORT_TABS: { id: ReportCategory; label: string }[] = [
  { id: 'PRODUCTION_DAILY', label: 'Daily Production' },
  { id: 'MATERIAL_CONSUMPTION', label: 'Material Consumption' },
  { id: 'RAW_MATERIAL_STOCK', label: 'Raw Material Stock' },
  { id: 'PURCHASE_SUMMARY', label: 'Purchase Summary' },
  { id: 'SALES_ORDERS', label: 'Sales & Orders' },
  { id: 'DISPATCH_LOG', label: 'Dispatch Log' },
  { id: 'OUTSTANDING_PAYMENTS', label: 'Outstanding Receivables' },
  { id: 'CRM_LEADS_PIPELINE', label: 'CRM Leads & Pipeline' },
];

export const ReportsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportCategory>('PRODUCTION_DAILY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  // Filter States
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [floorFilter, setFloorFilter] = useState<'ALL' | 'GROUND' | 'SECOND'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const canViewReports = hasPermission('reports.view');

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const criteria: any = {
        startDate: startDateStr ? new Date(`${startDateStr}T00:00:00`) : undefined,
        endDate: endDateStr ? new Date(`${endDateStr}T23:59:59`) : undefined,
        floor: floorFilter === 'ALL' ? undefined : floorFilter,
      };

      let result: any[] = [];

      switch (activeTab) {
        case 'PRODUCTION_DAILY':
          result = await generateDailyProductionReport(criteria);
          break;
        case 'MATERIAL_CONSUMPTION':
          result = await generateMaterialConsumptionReport(criteria);
          break;
        case 'RAW_MATERIAL_STOCK':
          result = await generateRawMaterialStockReport(criteria);
          break;
        case 'PURCHASE_SUMMARY':
          result = await generatePurchaseReport(criteria);
          break;
        case 'SALES_ORDERS':
          result = await generateOrdersReport(criteria);
          break;
        case 'DISPATCH_LOG':
          result = await generateDispatchReport(criteria);
          break;
        case 'OUTSTANDING_PAYMENTS':
          result = await generateOutstandingPaymentsReport(criteria);
          break;
        case 'CRM_LEADS_PIPELINE':
          result = await generateCrmLeadsReport(criteria);
          break;
      }

      setRows(result);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err?.message || 'Failed to fetch report records.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDateStr, endDateStr, floorFilter]);

  useEffect(() => {
    if (canViewReports) {
      fetchReportData();
    }
  }, [fetchReportData, canViewReports]);

  // Export current table as CSV
  const handleExportCsv = () => {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === undefined || val === null) return '""';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!canViewReports) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
        You do not have permission to view business reports.
      </div>
    );
  }

  // Filter rows locally by text search
  const filteredRows = rows.filter((row) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #D9EAF0',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#E0F2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#087EA4',
            }}
          >
            <FileBarChart size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F2942', margin: 0 }}>
              Reports Hub
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
              Operational summaries, inventory analysis, and financial ledgers
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: filteredRows.length === 0 ? '#F1F5F9' : '#087EA4',
            color: filteredRows.length === 0 ? '#94A3B8' : '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: filteredRows.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '2px',
        }}
      >
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#087EA4' : '#64748B',
                borderBottom: isActive ? '2px solid #087EA4' : '2px solid transparent',
                backgroundColor: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9EAF0',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Date range picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#64748B" />
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
              }}
            />
            <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Floor filter for production tab */}
          {activeTab === 'PRODUCTION_DAILY' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={16} color="#64748B" />
              <select
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value as any)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                }}
              >
                <option value="ALL">All Floors</option>
                <option value="GROUND">Ground Floor</option>
                <option value="SECOND">Second Floor</option>
              </select>
            </div>
          )}

          <button
            onClick={fetchReportData}
            type="button"
            style={{
              padding: '6px 12px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={12} />
            <span>Apply</span>
          </button>
        </div>

        {/* Text search filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search report..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              width: '180px',
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9EAF0',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        {loading ? (
          <div
            style={{
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <Loader2 size={32} color="#087EA4" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '13px', color: '#64748B' }}>Generating report table...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#DC2626' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#64748B',
              fontSize: '13px',
            }}
          >
            No data found matching the selected report criteria and filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                  {Object.keys(filteredRows[0]).map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: '10px 14px',
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFD',
                    }}
                  >
                    {Object.entries(row).map(([key, val], cellIdx) => {
                      const isMoney =
                        key.toLowerCase().includes('amount') ||
                        key.toLowerCase().includes('price') ||
                        key.toLowerCase().includes('balance');

                      const isStatus = key.toLowerCase().includes('status');

                      return (
                        <td
                          key={cellIdx}
                          style={{
                            padding: '10px 14px',
                            color: '#0F2942',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isStatus ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor:
                                  val === 'NORMAL' || val === 'PAID' || val === 'COMPLETED' || val === 'DELIVERED'
                                    ? '#DCFCE7'
                                    : val === 'LOW' || val === 'PARTIALLY_PAID' || val === 'IN_PRODUCTION'
                                    ? '#FEF3C7'
                                    : val === 'OUT_OF_STOCK' || val === 'CANCELLED'
                                    ? '#FEE2E2'
                                    : '#E0F2FE',
                                color:
                                  val === 'NORMAL' || val === 'PAID' || val === 'COMPLETED' || val === 'DELIVERED'
                                    ? '#15803D'
                                    : val === 'LOW' || val === 'PARTIALLY_PAID' || val === 'IN_PRODUCTION'
                                    ? '#B45309'
                                    : val === 'OUT_OF_STOCK' || val === 'CANCELLED'
                                    ? '#B91C1C'
                                    : '#0369A1',
                              }}
                            >
                              {String(val)}
                            </span>
                          ) : isMoney && typeof val === 'number' ? (
                            `₹${val.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          ) : typeof val === 'number' ? (
                            val.toLocaleString('en-IN')
                          ) : (
                            String(val ?? '—')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748B',
          }}
        >
          <span>Showing {filteredRows.length} records</span>
          <span>SKATI Analytics Engine</span>
        </div>
      </div>
    </div>
  );
};
