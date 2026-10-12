import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Package } from 'lucide-react';
import type { FinishedProductStock } from '../../services/production/productionTypes.ts';
import { getFinishedProductStockList } from '../../services/inventory/finishedProductStock.ts';
import { getProductUnitLabel } from '../../constants/products.ts';

export const FinishedProductsPage: React.FC = () => {
  const [stockList, setStockList] = useState<FinishedProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getFinishedProductStockList(50);
      setStockList(res.items);
    } catch (err: unknown) {
      console.error('Failed to load finished stock:', err);
      setError(err instanceof Error ? err.message : 'Failed to load finished goods stock.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStock();
  }, [fetchStock]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F2942',
              letterSpacing: '-0.3px',
            }}
          >
            Finished Goods Inventory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Current warehouse stock of manufactured finished filter products
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchStock()}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #D9EAF0',
            backgroundColor: '#FFFFFF',
            color: '#0F2942',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#991B1B',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Finished Goods Stock Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Product Code
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Product Name
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Current Stock
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Unit
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: '#64748B',
                      fontSize: '14px',
                    }}
                  >
                    Loading finished goods inventory...
                  </td>
                </tr>
              ) : stockList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#64748B',
                      }}
                    >
                      <Package size={36} color="#94A3B8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                        No finished goods in stock
                      </span>
                      <span style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                        Execute production batches to manufacture finished goods and populate inventory.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                stockList.map((item) => {
                  const updatedStr = item.updatedAt?.toDate
                    ? item.updatedAt.toDate().toLocaleString()
                    : '—';

                  return (
                    <tr
                      key={item.productId}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#087EA4',
                        }}
                      >
                        {item.productCodeSnapshot}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0F2942',
                        }}
                      >
                        {item.productNameSnapshot}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: item.currentStock > 0 ? '#16A34A' : '#DC2626',
                          }}
                        >
                          {item.currentStock}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                        {getProductUnitLabel(item.unit)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748B' }}>
                        {updatedStr}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
