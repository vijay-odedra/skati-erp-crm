import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Send,
  Check,
  Ban,
  ShoppingCart,
} from 'lucide-react';
import type { QuotationDetailsResult, QuotationStatus } from '../../services/crm/crmTypes.ts';
import { getQuotationDetails, updateQuotationStatus } from '../../services/crm/quotations.ts';
import { convertQuotationToOrder } from '../../services/orders/orderExecution.ts';
import { QUOTATION_STATUS_CONFIG } from '../../constants/crm.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface QuotationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string | null;
  onStatusUpdated?: () => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  isOpen,
  onClose,
  quotationId,
  onStatusUpdated,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<QuotationDetailsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotationData = useCallback(async () => {
    if (!quotationId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getQuotationDetails(quotationId);
      if (!res) {
        setError('Quotation record not found.');
      } else {
        setData(res);
      }
    } catch (err: unknown) {
      console.error('Error fetching quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    if (isOpen && quotationId) {
      void fetchQuotationData();
    }
  }, [isOpen, quotationId, fetchQuotationData]);

  if (!isOpen || !quotationId) return null;

  const quotation = data?.quotation;
  const items = data?.items || [];
  const statusConf = quotation ? QUOTATION_STATUS_CONFIG[quotation.status] : null;

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!quotation || !user) return;
    try {
      setActionLoading(true);
      await updateQuotationStatus(quotation.id, newStatus, user.uid);
      await fetchQuotationData();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      console.error('Error updating quotation status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quotation status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!quotation || !user) return;
    try {
      setActionLoading(true);
      const order = await convertQuotationToOrder(quotation.id, user.uid);
      await fetchQuotationData();
      if (onStatusUpdated) onStatusUpdated();
      alert(`Sales Order ${order.orderCode} successfully created from Quotation!`);
    } catch (err: unknown) {
      console.error('Error converting quotation to order:', err);
      setError(err instanceof Error ? err.message : 'Failed to convert quotation to order.');
    } finally {
      setActionLoading(false);
    }
  };

  const isFinalized = quotation && ['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(quotation.status);

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
          maxWidth: '920px',
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
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {quotation?.quotationCode || 'Quotation Details'}
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
                Client: <strong style={{ color: '#0F2942' }}>{quotation?.customerNameSnapshot}</strong> ({quotation?.customerCodeSnapshot})
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
              Loading quotation details...
            </div>
          ) : error || !quotation ? (
            <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px' }}>
              {error || 'Quotation not found'}
            </div>
          ) : (
            <>
              {/* Meta information & workflow status buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  backgroundColor: '#F8FAFC',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Quotation Date: </span>
                    <strong style={{ color: '#0F2942' }}>
                      {quotation.quotationDate?.toDate
                        ? quotation.quotationDate.toDate().toLocaleDateString()
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Validity: </span>
                    <strong style={{ color: '#0F2942' }}>
                      {quotation.validUntil?.toDate
                        ? quotation.validUntil.toDate().toLocaleDateString()
                        : '30 Days'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isFinalized && (
                    <>
                      {quotation.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange('SENT')}
                          disabled={actionLoading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            border: '1px solid #087EA4',
                            backgroundColor: '#E0F2FE',
                            color: '#087EA4',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Send size={13} />
                          <span>Mark Sent</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleStatusChange('ACCEPTED')}
                        disabled={actionLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #16A34A',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={13} />
                        <span>Accept / Won</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleStatusChange('REJECTED')}
                        disabled={actionLoading}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#64748B',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <Ban size={13} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {quotation.status === 'ACCEPTED' && !quotation.acceptedOrderId && (
                    <button
                      type="button"
                      onClick={() => void handleConvertToOrder()}
                      disabled={actionLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <ShoppingCart size={13} />
                      <span>Convert to Sales Order</span>
                    </button>
                  )}

                  {quotation.status === 'ACCEPTED' && quotation.acceptedOrderId && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Check size={13} />
                      <span>Sales Order Created</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                  Quotation Item Schedule ({items.length})
                </h3>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Item Description</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Quantity</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Unit Price (₹)</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Tax (%)</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0F2942' }}>{item.productNameSnapshot}</div>
                            {item.description && (
                              <div style={{ fontSize: '12px', color: '#64748B' }}>{item.description}</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: '#0F2942' }}>
                            {item.quantity} {item.unit}
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

              {/* Notes & Financial Totals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Commercial Terms &amp; Notes
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                    {quotation.notes || 'No specific terms specified.'}
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
                    <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{quotation.subtotal.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                    <span>GST Tax:</span>
                    <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{quotation.taxAmount.toFixed(2)}</span>
                  </div>

                  {quotation.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#16A34A' }}>
                      <span>Discount:</span>
                      <span>-₹{quotation.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

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
                    <span>₹{quotation.grandTotal.toFixed(2)}</span>
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
