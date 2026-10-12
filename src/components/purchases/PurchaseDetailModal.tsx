import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import type { PurchaseDetailsResult } from '../../services/purchases/purchases.ts';
import { getPurchaseDetails } from '../../services/purchases/purchases.ts';
import { PURCHASE_STATUS_CONFIG } from '../../constants/purchases.ts';
import { getUnitLabel } from '../../constants/inventory.ts';

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: string | null;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
}) => {
  const [data, setData] = useState<PurchaseDetailsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseDetails = useCallback(async () => {
    if (!purchaseId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseDetails(purchaseId);
      if (!res) {
        setError('Purchase record not found.');
      } else {
        setData(res);
      }
    } catch (err: unknown) {
      console.error('Error loading purchase details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load purchase details.');
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    if (isOpen && purchaseId) {
      void fetchPurchaseDetails();
    }
  }, [isOpen, purchaseId, fetchPurchaseDetails]);

  if (!isOpen || !purchaseId) return null;

  const purchase = data?.purchase;
  const items = data?.items || [];
  const statusConf = purchase ? PURCHASE_STATUS_CONFIG[purchase.status] : null;

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
          maxWidth: '900px',
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
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {purchase?.purchaseCode || 'Purchase Details'}
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
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Supplier: <strong style={{ color: '#0F2942' }}>{purchase?.supplierNameSnapshot}</strong> ({purchase?.supplierCodeSnapshot})
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

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading purchase details and items...
            </div>
          ) : error || !purchase ? (
            <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px' }}>
              {error || 'Purchase record not found.'}
            </div>
          ) : (
            <>
              {/* Top Meta Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  backgroundColor: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Invoice Number</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942', marginTop: '2px' }}>
                    {purchase.invoiceNumber || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Invoice Date</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942', marginTop: '2px' }}>
                    {purchase.purchaseDate?.toDate
                      ? purchase.purchaseDate.toDate().toLocaleDateString()
                      : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Recorded At</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942', marginTop: '2px' }}>
                    {purchase.createdAt?.toDate
                      ? purchase.createdAt.toDate().toLocaleString()
                      : '—'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Total Line Items</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#087EA4', marginTop: '2px' }}>
                    {items.length} {items.length === 1 ? 'material' : 'materials'}
                  </div>
                </div>
              </div>

              {/* Line Items List */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                  Raw Materials Inward Ledger
                </h3>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Material Code</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Material Name</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Quantity Inward</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Unit Price (₹)</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Tax (%)</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#087EA4' }}>
                            {item.materialCodeSnapshot}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#0F2942' }}>
                            {item.materialNameSnapshot}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                            +{item.quantity} {getUnitLabel(item.unit)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748B' }}>
                            {item.taxRate}% (₹{item.taxAmount.toFixed(2)})
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                            ₹{item.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks & Financial Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Notes &amp; Audit Traceability
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                    {purchase.notes || 'No specific purchase notes entered.'}
                  </div>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={14} color="#16A34A" />
                    <span>Inventory stock transactions linked to reference #{purchase.id}</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{purchase.subtotal.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                    <span>Total Tax:</span>
                    <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{purchase.taxAmount.toFixed(2)}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#087EA4',
                      borderTop: '1px solid #E2E8F0',
                      paddingTop: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span>Grand Total:</span>
                    <span>₹{purchase.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
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
