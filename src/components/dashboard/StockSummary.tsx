import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowUpRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { StockSummaryData } from '../../services/dashboard/dashboardTypes.ts';

interface StockSummaryProps {
  data?: StockSummaryData;
}

export const StockSummary: React.FC<StockSummaryProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #D9EAF0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} color="#087EA4" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            Inventory & Stock Health
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/raw-materials"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#087EA4',
              textDecoration: 'none',
            }}
          >
            <span>Raw Materials</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/products"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#087EA4',
              textDecoration: 'none',
            }}
          >
            <span>Finished Goods</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* KPI sub-cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
              RAW MATERIALS
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', marginTop: '2px' }}>
              {data.activeMaterialsCount}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>active</span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: data.lowStockMaterialsCount > 0 ? '#FFFBEB' : '#F0FDF4',
              borderRadius: '8px',
              border: `1px solid ${data.lowStockMaterialsCount > 0 ? '#FED7AA' : '#BBF7D0'}`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: data.lowStockMaterialsCount > 0 ? '#B45309' : '#15803D',
              }}
            >
              LOW / OUT OF STOCK
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: data.lowStockMaterialsCount > 0 ? '#B45309' : '#15803D',
                marginTop: '2px',
              }}
            >
              {data.lowStockMaterialsCount}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500 }}>materials</span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F0F9FF',
              borderRadius: '8px',
              border: '1px solid #BAE6FD',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0369A1' }}>
              FINISHED GOODS
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#075985', marginTop: '2px' }}>
              {data.availableFinishedProductsCount}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#0369A1' }}>in stock</span>
            </div>
          </div>
        </div>

        {/* Low Stock Items List or Good Health Message */}
        {data.lowStockItems && data.lowStockItems.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#B45309',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangle size={14} />
              <span>Critical Raw Materials ({data.lowStockItems.length})</span>
            </div>
            <div
              style={{
                borderRadius: '6px',
                border: '1px solid #FED7AA',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FFFBEB', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: '#92400E' }}>Material</th>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: '#92400E', textAlign: 'right' }}>Current</th>
                    <th style={{ padding: '6px 10px', fontWeight: 600, color: '#92400E', textAlign: 'right' }}>Min Required</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowStockItems.slice(0, 5).map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderTop: '1px solid #FEF3C7',
                        backgroundColor: item.isOutOfStock ? '#FEF2F2' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '6px 10px', color: '#0F2942' }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>{item.materialCode}</div>
                      </td>
                      <td
                        style={{
                          padding: '6px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: item.isOutOfStock ? '#DC2626' : '#D97706',
                        }}
                      >
                        {item.currentStock.toLocaleString('en-IN')} {item.unit}
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#64748B' }}>
                        {item.minimumStock.toLocaleString('en-IN')} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#F0FDF4',
              borderRadius: '6px',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#15803D',
              fontSize: '12px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>All active raw materials are currently above minimum stock thresholds.</span>
          </div>
        )}
      </div>
    </div>
  );
};
