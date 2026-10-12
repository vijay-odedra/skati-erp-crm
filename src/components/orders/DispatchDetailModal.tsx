import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Truck,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { DispatchDetailsResult } from '../../services/orders/orderTypes.ts';
import { getDispatchDetails } from '../../services/orders/dispatches.ts';
import { DISPATCH_STATUS_CONFIG } from '../../constants/orders.ts';

interface DispatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchId: string | null;
  onViewOrder?: (orderId: string) => void;
}

export const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({
  isOpen,
  onClose,
  dispatchId,
  onViewOrder,
}) => {
  const [data, setData] = useState<DispatchDetailsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!dispatchId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getDispatchDetails(dispatchId);
      if (!res) {
        setError('Dispatch record not found.');
      } else {
        setData(res);
      }
    } catch (err: unknown) {
      console.error('Error fetching dispatch details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dispatch details.');
    } finally {
      setLoading(false);
    }
  }, [dispatchId]);

  useEffect(() => {
    if (isOpen && dispatchId) {
      void fetchDetails();
    }
  }, [isOpen, dispatchId, fetchDetails]);

  if (!isOpen || !dispatchId) return null;

  const dispatch = data?.dispatch;
  const items = data?.items || [];
  const statusConf = dispatch ? DISPATCH_STATUS_CONFIG[dispatch.status] : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {dispatch?.dispatchCode || 'Dispatch Details'}
                </h2>
                {statusConf && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusConf.bgColor,
                      color: statusConf.color,
                      border: `1px solid ${statusConf.borderColor}`,
                    }}
                  >
                    {statusConf.label}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Customer: <strong style={{ color: '#0F2942' }}>{dispatch?.customerNameSnapshot}</strong> ({dispatch?.customerCodeSnapshot})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading dispatch details...
            </div>
          ) : error || !dispatch ? (
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{error || 'Dispatch record not found'}</span>
            </div>
          ) : (
            <>
              {/* Dispatch Logistics Info */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '14px',
                  backgroundColor: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Associated Order:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <strong style={{ fontSize: '14px', color: '#0F2942' }}>{dispatch.orderCodeSnapshot}</strong>
                    {onViewOrder && (
                      <button
                        type="button"
                        onClick={() => onViewOrder(dispatch.orderId)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#2563EB',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        View Order
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Dispatch Date:</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#64748B" />
                    <span>{dispatch.dispatchDate?.toDate ? dispatch.dispatchDate.toDate().toLocaleDateString() : '—'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Transporter / Vehicle:</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942', marginTop: '3px' }}>
                    {dispatch.transporter || dispatch.vehicleNumber ? (
                      `${dispatch.transporter || 'Direct'} ${dispatch.vehicleNumber ? `[${dispatch.vehicleNumber}]` : ''}`
                    ) : (
                      '—'
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Tracking Number / LR:</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942', marginTop: '3px' }}>
                    {dispatch.trackingNumber || '—'}
                  </div>
                </div>

                {dispatch.deliveryAddress && (
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} />
                      <span>Delivery Address:</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '3px' }}>
                      {dispatch.deliveryAddress}
                    </div>
                  </div>
                )}
              </div>

              {/* Items Dispatched Table */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#087EA4" />
                  <span>Dispatched Items ({items.length})</span>
                </h3>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Product</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Quantity Dispatched</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0F2942' }}>{it.productNameSnapshot}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{it.productCodeSnapshot}</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#059669', fontSize: '14px' }}>
                            {it.quantity} {it.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                      <tr>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F2942' }}>Total Dispatched Units</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#0F2942', fontSize: '15px' }}>
                          {dispatch.totalQuantity} units
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {dispatch.notes && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Dispatch Notes</div>
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{dispatch.notes}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
