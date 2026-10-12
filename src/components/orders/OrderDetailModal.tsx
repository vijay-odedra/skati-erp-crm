import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShoppingCart,
  Truck,
  CreditCard,
  Factory,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { OrderDetailsResult, OrderStatus } from '../../services/orders/orderTypes.ts';
import { getOrderDetails } from '../../services/orders/orders.ts';
import { updateOrderStatus } from '../../services/orders/orderExecution.ts';
import { OrderStatusBadge } from './OrderStatusBadge.tsx';
import { DISPATCH_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '../../constants/orders.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderUpdated?: () => void;
  onCreateDispatch?: (orderId: string) => void;
  onRecordPayment?: (orderId: string) => void;
  onViewDispatch?: (dispatchId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderUpdated,
  onCreateDispatch,
  onRecordPayment,
  onViewDispatch,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<OrderDetailsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'DISPATCHES' | 'PAYMENTS' | 'PRODUCTION'>('ITEMS');

  const fetchDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getOrderDetails(orderId);
      if (!res) {
        setError('Order not found.');
      } else {
        setData(res);
      }
    } catch (err: unknown) {
      console.error('Error fetching order details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      void fetchDetails();
    }
  }, [isOpen, orderId, fetchDetails]);

  if (!isOpen || !orderId) return null;

  const order = data?.order;
  const items = data?.items || [];
  const dispatches = data?.dispatches || [];
  const payments = data?.payments || [];
  const productionLinks = data?.productionLinks || [];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || !user) return;
    try {
      setStatusUpdating(true);
      await updateOrderStatus(order.id, newStatus, user.uid);
      await fetchDetails();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err: unknown) {
      console.error('Failed to update status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const totalOrderedQty = items.reduce((sum, it) => sum + it.orderedQuantity, 0);
  const totalProducedQty = items.reduce((sum, it) => sum + (it.producedQuantity || 0), 0);
  const totalDispatchedQty = items.reduce((sum, it) => sum + (it.dispatchedQuantity || 0), 0);

  const prodProgress = totalOrderedQty > 0 ? Math.min(100, Math.round((totalProducedQty / totalOrderedQty) * 100)) : 0;
  const dispatchProgress = totalOrderedQty > 0 ? Math.min(100, Math.round((totalDispatchedQty / totalOrderedQty) * 100)) : 0;

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
          maxWidth: '1000px',
          maxHeight: '92vh',
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
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {order?.orderCode || 'Sales Order Details'}
                </h2>
                {order && <OrderStatusBadge status={order.status} />}
                {order?.quotationCodeSnapshot && (
                  <span style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                    From Quotation: <strong>{order.quotationCodeSnapshot}</strong>
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Customer: <strong style={{ color: '#0F2942' }}>{order?.customerNameSnapshot}</strong> ({order?.customerCodeSnapshot})
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

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading order details...
            </div>
          ) : error || !order ? (
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{error || 'Order record not found'}</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Grand Total</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', marginTop: '4px' }}>₹{order.grandTotal.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Tax: ₹{order.taxAmount.toFixed(2)}</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
                  <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Paid Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>₹{(order.paidAmount || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>{payments.length} receipt(s)</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: order.pendingAmount > 0 ? '#FFFBEB' : '#F8FAFC', border: `1px solid ${order.pendingAmount > 0 ? '#FDE68A' : '#E2E8F0'}` }}>
                  <div style={{ fontSize: '11px', color: order.pendingAmount > 0 ? '#92400E' : '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Pending Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: order.pendingAmount > 0 ? '#B45309' : '#0F2942', marginTop: '4px' }}>₹{order.pendingAmount.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{order.pendingAmount === 0 ? 'Fully Paid' : 'Payment Due'}</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Fulfillment</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942', marginTop: '4px' }}>
                    Prod: {prodProgress}% | Disp: {dispatchProgress}%
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${dispatchProgress}%`, backgroundColor: '#10B981', height: '100%' }} />
                    <div style={{ width: `${Math.max(0, prodProgress - dispatchProgress)}%`, backgroundColor: '#3B82F6', height: '100%' }} />
                  </div>
                </div>
              </div>

              {/* Action Toolbar & Dates */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="#64748B" />
                    <span>Ordered: <strong>{order.orderDate?.toDate ? order.orderDate.toDate().toLocaleDateString() : '—'}</strong></span>
                  </div>
                  {order.expectedDeliveryDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#64748B" />
                      <span>Delivery Due: <strong>{order.expectedDeliveryDate.toDate ? order.expectedDeliveryDate.toDate().toLocaleDateString() : '—'}</strong></span>
                    </div>
                  )}
                </div>

                {/* Workflow Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {order.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange('CONFIRMED')}
                      disabled={statusUpdating}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm Order
                    </button>
                  )}

                  {onCreateDispatch && ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'PARTIALLY_DISPATCHED'].includes(order.status) && (
                    <button
                      type="button"
                      onClick={() => onCreateDispatch(order.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Truck size={14} />
                      <span>Create Dispatch</span>
                    </button>
                  )}

                  {onRecordPayment && order.pendingAmount > 0 && order.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => onRecordPayment(order.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <CreditCard size={14} />
                      <span>Record Payment</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '16px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('ITEMS')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'ITEMS' ? '2px solid #2563EB' : '2px solid transparent',
                    color: activeTab === 'ITEMS' ? '#2563EB' : '#64748B',
                    fontWeight: activeTab === 'ITEMS' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={15} />
                  <span>Items ({items.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('DISPATCHES')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'DISPATCHES' ? '2px solid #2563EB' : '2px solid transparent',
                    color: activeTab === 'DISPATCHES' ? '#2563EB' : '#64748B',
                    fontWeight: activeTab === 'DISPATCHES' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Truck size={15} />
                  <span>Dispatches ({dispatches.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PAYMENTS')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'PAYMENTS' ? '2px solid #2563EB' : '2px solid transparent',
                    color: activeTab === 'PAYMENTS' ? '#2563EB' : '#64748B',
                    fontWeight: activeTab === 'PAYMENTS' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CreditCard size={15} />
                  <span>Payments ({payments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PRODUCTION')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === 'PRODUCTION' ? '2px solid #2563EB' : '2px solid transparent',
                    color: activeTab === 'PRODUCTION' ? '#2563EB' : '#64748B',
                    fontWeight: activeTab === 'PRODUCTION' ? 600 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Factory size={15} />
                  <span>Production History ({productionLinks.length})</span>
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'ITEMS' && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Product</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Ordered</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Produced</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Dispatched</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Unit Price (₹)</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Tax</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#0F2942' }}>{it.productNameSnapshot}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{it.productCodeSnapshot}</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                            {it.orderedQuantity} {it.unit}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: it.producedQuantity >= it.orderedQuantity ? '#15803D' : '#3B82F6', fontWeight: 500 }}>
                            {it.producedQuantity || 0} {it.unit}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: it.dispatchedQuantity >= it.orderedQuantity ? '#15803D' : '#D97706', fontWeight: 500 }}>
                            {it.dispatchedQuantity || 0} {it.unit}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#334155' }}>
                            ₹{it.unitPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748B' }}>
                            {it.taxRate}%
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                            ₹{it.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'DISPATCHES' && (
                <div>
                  {dispatches.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                      No dispatches recorded for this order yet.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Dispatch Code</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Total Units</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Vehicle / Transporter</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatches.map((d) => {
                            const conf = DISPATCH_STATUS_CONFIG[d.status];
                            return (
                              <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F2942' }}>{d.dispatchCode}</td>
                                <td style={{ padding: '10px 14px', color: '#64748B' }}>{d.dispatchDate?.toDate ? d.dispatchDate.toDate().toLocaleDateString() : '—'}</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: conf.bgColor, color: conf.color, border: `1px solid ${conf.borderColor}` }}>
                                    {conf.label}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>{d.totalQuantity}</td>
                                <td style={{ padding: '10px 14px', color: '#334155' }}>
                                  {d.vehicleNumber || d.transporter ? `${d.vehicleNumber || ''} ${d.transporter ? `(${d.transporter})` : ''}` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  {onViewDispatch && (
                                    <button
                                      type="button"
                                      onClick={() => onViewDispatch(d.id)}
                                      style={{
                                        border: '1px solid #CBD5E1',
                                        backgroundColor: '#FFFFFF',
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#087EA4',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      View
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'PAYMENTS' && (
                <div>
                  {payments.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                      No payments recorded for this order yet.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Payment Code</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Method</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Reference / Notes</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Amount Paid (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F2942' }}>{p.paymentCode}</td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>{p.paymentDate?.toDate ? p.paymentDate.toDate().toLocaleDateString() : '—'}</td>
                              <td style={{ padding: '10px 14px', color: '#334155' }}>{PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>
                                {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                                {p.notes && <div style={{ fontSize: '11px' }}>{p.notes}</div>}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#15803D' }}>
                                ₹{p.amount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'PRODUCTION' && (
                <div>
                  {productionLinks.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                      No linked production batches recorded for this order.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Production Batch</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Product</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Quantity Allocated</th>
                            <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Date Logged</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionLinks.map((pl) => (
                            <tr key={pl.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F2942' }}>{pl.productionCodeSnapshot}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <div style={{ fontWeight: 500, color: '#0F2942' }}>{pl.productNameSnapshot}</div>
                                <div style={{ fontSize: '11px', color: '#64748B' }}>{pl.productCodeSnapshot}</div>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#2563EB' }}>
                                {pl.quantityAllocated} {pl.unit}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>
                                {pl.createdAt?.toDate ? pl.createdAt.toDate().toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 16px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Internal Order Notes</div>
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{order.notes}</div>
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
