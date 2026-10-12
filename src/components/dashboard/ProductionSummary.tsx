import React from 'react';
import { Link } from 'react-router-dom';
import { Factory, Layers, ArrowUpRight } from 'lucide-react';
import type { ProductionSummaryData } from '../../services/dashboard/dashboardTypes.ts';

interface ProductionSummaryProps {
  data?: ProductionSummaryData;
}

export const ProductionSummary: React.FC<ProductionSummaryProps> = ({ data }) => {
  if (!data || data.batchCount === 0) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9EAF0',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Factory size={18} color="#087EA4" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
              Production Summary
            </h3>
          </div>
          <Link
            to="/production/new"
            style={{ fontSize: '12px', fontWeight: 600, color: '#087EA4', textDecoration: 'none' }}
          >
            + New Batch
          </Link>
        </div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          No production activity recorded for the selected period.
        </p>
      </div>
    );
  }

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
          <Factory size={18} color="#087EA4" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            Production Overview
          </h3>
        </div>
        <Link
          to="/production"
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
          <span>View Module</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Floor breakdown chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
              GROUND FLOOR
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', marginTop: '2px' }}>
              {data.groundFloorQuantity.toLocaleString('en-IN')}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>units</span>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
              SECOND FLOOR
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', marginTop: '2px' }}>
              {data.secondFloorQuantity.toLocaleString('en-IN')}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>units</span>
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
              TOTAL BATCHES
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#075985', marginTop: '2px' }}>
              {data.batchCount}{' '}
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#0369A1' }}>runs</span>
            </div>
          </div>
        </div>

        {/* Product Breakdown Table */}
        {data.productBreakdown && data.productBreakdown.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748B',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Layers size={14} />
              <span>Output By Product</span>
            </div>
            <div
              style={{
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Product</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                      Produced Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.productBreakdown.slice(0, 5).map((item, idx) => (
                    <tr
                      key={item.productId || idx}
                      style={{
                        borderTop: '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#0F2942' }}>
                        <div style={{ fontWeight: 500 }}>{item.productName}</div>
                        {item.productCode && (
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.productCode}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#087EA4' }}>
                        {item.quantity.toLocaleString('en-IN')} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
