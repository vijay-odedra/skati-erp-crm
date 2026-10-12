import React, { useEffect, useState, useCallback } from 'react';
import { X, History, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import type {
  RawMaterial,
  StockTransaction,
} from '../../services/inventory/inventoryTypes.ts';
import { getStockHistory } from '../../services/inventory/stockTransactions.ts';
import {
  getUnitLabel,
  TRANSACTION_TYPE_LABELS,
} from '../../constants/inventory.ts';
import { LoadingSpinner } from '../common/LoadingSpinner.tsx';

interface StockHistoryModalProps {
  material: RawMaterial | null;
  isOpen: boolean;
  onClose: () => void;
}

const StockHistoryContent: React.FC<{
  material: RawMaterial;
  onClose: () => void;
}> = ({ material, onClose }) => {
  const [history, setHistory] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getStockHistory(material.id, 100);
      setHistory(records);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to load stock history.');
    } finally {
      setLoading(false);
    }
  }, [material.id]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const unitLabel = getUnitLabel(material.unit);

  const formatTimestamp = (ts: StockTransaction['createdAt']): string => {
    if (!ts) return '—';
    try {
      if (ts.toDate) {
        return ts.toDate().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
      if (ts.seconds) {
        return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      }
      return '—';
    } catch {
      return '—';
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #D9EAF0',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '85vh',
        boxShadow: '0 8px 24px rgba(15, 41, 66, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #D9EAF0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              backgroundColor: '#E0F2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#087EA4',
            }}
          >
            <History size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', margin: 0 }}>
                Stock Audit History
              </h2>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#075985',
                  backgroundColor: '#E0F2FE',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {material.materialCode}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {material.name} &bull; Current Balance: <strong>{material.currentStock} {unitLabel}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchHistory}
            title="Refresh History"
            style={{
              background: 'none',
              border: '1px solid #D9EAF0',
              borderRadius: '6px',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Table Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            <LoadingSpinner message="Loading transaction audit trail..." />
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#DC2626' }}>
            {error}
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>No stock transactions recorded yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Reference / Reason</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => {
                  const typeConfig = TRANSACTION_TYPE_LABELS[tx.type] || {
                    label: tx.type,
                    isCredit: true,
                  };
                  const isCredit = typeConfig.isCredit;

                  return (
                    <tr
                      key={tx.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <td style={{ padding: '12px', color: '#0F2942', whiteSpace: 'nowrap' }}>
                        {formatTimestamp(tx.createdAt)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: isCredit ? '#DCFCE7' : '#FEE2E2',
                            color: isCredit ? '#15803D' : '#B91C1C',
                          }}
                        >
                          {isCredit ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}
                          {typeConfig.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: isCredit ? '#16A34A' : '#DC2626',
                        }}
                      >
                        {isCredit ? `+${tx.quantity}` : `-${tx.quantity}`} {getUnitLabel(tx.unit)}
                      </td>
                      <td style={{ padding: '12px', color: '#475569', maxWidth: '260px' }}>
                        <div>{tx.reason || '—'}</div>
                        {tx.referenceId && (
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                            Ref: {tx.referenceId}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#64748B', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {tx.createdBy || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '14px 24px',
          borderTop: '1px solid #D9EAF0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Showing {history.length} transactions (Immutable audit trail)
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '7px 16px',
            borderRadius: '6px',
            border: '1px solid #D9EAF0',
            backgroundColor: '#FFFFFF',
            color: '#0F2942',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !material) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 41, 66, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <StockHistoryContent
        key={material.id}
        material={material}
        onClose={onClose}
      />
    </div>
  );
};
