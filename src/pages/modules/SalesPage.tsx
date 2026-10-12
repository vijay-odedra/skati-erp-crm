import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  ShoppingCart,
  Truck,
  CreditCard,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
  FileCheck,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type {
  Order,
  OrderStatus,
  Dispatch,
  DispatchStatus,
  Payment,
} from '../../services/orders/orderTypes.ts';
import { getOrders } from '../../services/orders/orders.ts';
import { getDispatches } from '../../services/orders/dispatches.ts';
import { getPayments } from '../../services/orders/payments.ts';
import { OrderStatusBadge } from '../../components/orders/OrderStatusBadge.tsx';
import { OrderFormModal } from '../../components/orders/OrderFormModal.tsx';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal.tsx';
import { DispatchFormModal } from '../../components/orders/DispatchFormModal.tsx';
import { DispatchDetailModal } from '../../components/orders/DispatchDetailModal.tsx';
import { PaymentFormModal } from '../../components/orders/PaymentFormModal.tsx';
import { DISPATCH_STATUS_CONFIG, PAYMENT_METHOD_LABELS } from '../../constants/orders.ts';
import { useAuth } from '../../hooks/useAuth.ts';

type SalesTab = 'orders' | 'dispatches' | 'payments';

export const SalesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<SalesTab>('orders');
  const canCreateOrder = hasPermission('orders.create') || hasPermission('sales.create');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<DispatchStatus | 'ALL'>('ALL');

  // Orders Tab Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Dispatches Tab Data
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);
  const [dispatchesError, setDispatchesError] = useState<string | null>(null);

  // Payments Tab Data
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  // Modals state
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false);
  const [dispatchPreselectedOrderId, setDispatchPreselectedOrderId] = useState<string | undefined>(undefined);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);

  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentPreselectedOrderId, setPaymentPreselectedOrderId] = useState<string | undefined>(undefined);

  // Fetch Orders
  const fetchOrdersList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setOrdersLoading(true);
        setOrdersError(null);
        const res = await getOrders(
          {
            status: selectedOrderStatus === 'ALL' ? undefined : selectedOrderStatus,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );
        setOrders(res.items);
        setHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load orders:', err);
        setOrdersError(err instanceof Error ? err.message : 'Failed to load orders.');
      } finally {
        setOrdersLoading(false);
      }
    },
    [selectedOrderStatus, searchQuery, page]
  );

  // Fetch Dispatches
  const fetchDispatchesList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setDispatchesLoading(true);
        setDispatchesError(null);
        const res = await getDispatches(
          {
            status: selectedDispatchStatus === 'ALL' ? undefined : selectedDispatchStatus,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );
        setDispatches(res.items);
        setHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load dispatches:', err);
        setDispatchesError(err instanceof Error ? err.message : 'Failed to load dispatches.');
      } finally {
        setDispatchesLoading(false);
      }
    },
    [selectedDispatchStatus, searchQuery, page]
  );

  // Fetch Payments
  const fetchPaymentsList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setPaymentsLoading(true);
        setPaymentsError(null);
        const res = await getPayments(
          {
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );
        setPayments(res.items);
        setHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load payments:', err);
        setPaymentsError(err instanceof Error ? err.message : 'Failed to load payments.');
      } finally {
        setPaymentsLoading(false);
      }
    },
    [searchQuery, page]
  );

  // Handle tab switch
  const handleTabChange = (tab: SalesTab) => {
    setActiveTab(tab);
    setPage(1);
    setPageCursors([null]);
    setSearchQuery('');
  };

  useEffect(() => {
    const cursor = pageCursors[page - 1] || null;
    if (activeTab === 'orders') {
      void fetchOrdersList(cursor);
    } else if (activeTab === 'dispatches') {
      void fetchDispatchesList(cursor);
    } else if (activeTab === 'payments') {
      void fetchPaymentsList(cursor);
    }
  }, [activeTab, page, fetchOrdersList, fetchDispatchesList, fetchPaymentsList, pageCursors]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    startTransition(() => {
      setPage(newPage);
    });
  };

  const handleOpenDispatchForOrder = (orderId: string) => {
    setDispatchPreselectedOrderId(orderId);
    setIsDispatchFormOpen(true);
  };

  const handleOpenPaymentForOrder = (orderId: string) => {
    setPaymentPreselectedOrderId(orderId);
    setIsPaymentFormOpen(true);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
            Commercial Fulfillment &amp; Sales
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '14px' }}>
            Manage sales orders, dispatch tracking, finished product shipments, and customer payments.
          </p>
        </div>

        {canCreateOrder && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeTab === 'orders' && (
              <button
                type="button"
                onClick={() => setIsOrderFormOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Plus size={18} />
                <span>New Sales Order</span>
              </button>
            )}

            {activeTab === 'dispatches' && (
              <button
                type="button"
                onClick={() => {
                  setDispatchPreselectedOrderId(undefined);
                  setIsDispatchFormOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Plus size={18} />
                <span>Create Dispatch</span>
              </button>
            )}

            {activeTab === 'payments' && (
              <button
                type="button"
                onClick={() => {
                  setPaymentPreselectedOrderId(undefined);
                  setIsPaymentFormOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Plus size={18} />
                <span>Record Payment</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', gap: '24px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('orders')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'orders' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'orders' ? '#2563EB' : '#64748B',
            fontWeight: activeTab === 'orders' ? 600 : 500,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          <ShoppingCart size={18} />
          <span>Sales Orders</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('dispatches')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'dispatches' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'dispatches' ? '#2563EB' : '#64748B',
            fontWeight: activeTab === 'dispatches' ? 600 : 500,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          <Truck size={18} />
          <span>Dispatches &amp; Shipments</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('payments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 4px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'payments' ? '2px solid #2563EB' : '2px solid transparent',
            color: activeTab === 'payments' ? '#2563EB' : '#64748B',
            fontWeight: activeTab === 'payments' ? 600 : 500,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          <CreditCard size={18} />
          <span>Customer Payments</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '6px 12px',
              width: '100%',
              maxWidth: '360px',
            }}
          >
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
                setPageCursors([null]);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '13px',
                color: '#0F2942',
              }}
            />
          </div>

          {activeTab === 'orders' && (
            <select
              value={selectedOrderStatus}
              onChange={(e) => {
                setSelectedOrderStatus(e.target.value as OrderStatus | 'ALL');
                setPage(1);
                setPageCursors([null]);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
              }}
            >
              <option value="ALL">All Order Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PRODUCTION">In Production</option>
              <option value="READY_TO_DISPATCH">Ready to Dispatch</option>
              <option value="PARTIALLY_DISPATCHED">Partially Dispatched</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}

          {activeTab === 'dispatches' && (
            <select
              value={selectedDispatchStatus}
              onChange={(e) => {
                setSelectedDispatchStatus(e.target.value as DispatchStatus | 'ALL');
                setPage(1);
                setPageCursors([null]);
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
              }}
            >
              <option value="ALL">All Dispatch Statuses</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            const cursor = pageCursors[page - 1] || null;
            if (activeTab === 'orders') void fetchOrdersList(cursor);
            if (activeTab === 'dispatches') void fetchDispatchesList(cursor);
            if (activeTab === 'payments') void fetchPaymentsList(cursor);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <>
            {ordersLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading sales orders...</div>
            ) : ordersError ? (
              <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{ordersError}</span>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                <FileCheck size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>No sales orders found.</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Create a sales order directly or convert an accepted quotation.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Order Code</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Order Date</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Grand Total (₹)</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Paid (₹)</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Pending (₹)</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F2942' }}>
                        <div>{o.orderCode}</div>
                        {o.quotationCodeSnapshot && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>From {o.quotationCodeSnapshot}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0F2942' }}>{o.customerNameSnapshot}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{o.customerCodeSnapshot}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {o.orderDate?.toDate ? o.orderDate.toDate().toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                        ₹{(o.grandTotal !== undefined ? o.grandTotal : (o as unknown as { totalAmount?: number }).totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#15803D', fontWeight: 500 }}>
                        ₹{(o.paidAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: (o.pendingAmount || 0) > 0 ? '#B45309' : '#64748B', fontWeight: 600 }}>
                        ₹{(o.pendingAmount !== undefined ? o.pendingAmount : Math.max(0, (o.grandTotal || (o as unknown as { totalAmount?: number }).totalAmount || 0) - (o.paidAmount || 0))).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(o.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#087EA4',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* TAB 2: DISPATCHES */}
        {activeTab === 'dispatches' && (
          <>
            {dispatchesLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading dispatch records...</div>
            ) : dispatchesError ? (
              <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{dispatchesError}</span>
              </div>
            ) : dispatches.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                <Truck size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>No dispatches recorded yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Dispatch Code</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Order</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Dispatch Date</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Total Units</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Vehicle / Transporter</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d) => {
                    const conf = DISPATCH_STATUS_CONFIG[d.status];
                    return (
                      <tr key={d.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F2942' }}>{d.dispatchCode}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#2563EB' }}>{d.orderCodeSnapshot}</td>
                        <td style={{ padding: '12px 16px', color: '#0F2942', fontWeight: 500 }}>{d.customerNameSnapshot}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>
                          {d.dispatchDate?.toDate ? d.dispatchDate.toDate().toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: conf.bgColor, color: conf.color, border: `1px solid ${conf.borderColor}` }}>
                            {conf.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F2942' }}>
                          {d.totalQuantity}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          {d.vehicleNumber || d.transporter ? `${d.vehicleNumber || ''} ${d.transporter ? `(${d.transporter})` : ''}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDispatchId(d.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#087EA4',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <>
            {paymentsLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading payment receipts...</div>
            ) : paymentsError ? (
              <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{paymentsError}</span>
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                <CreditCard size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>No customer payment receipts recorded yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Receipt Code</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Order</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Customer</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Payment Date</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Method</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600 }}>Reference / Notes</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F2942' }}>{p.paymentCode}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#2563EB' }}>{p.orderCodeSnapshot}</td>
                      <td style={{ padding: '12px 16px', color: '#0F2942', fontWeight: 500 }}>{p.customerNameSnapshot}</td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {p.paymentDate?.toDate ? p.paymentDate.toDate().toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748B' }}>
                        {p.referenceNumber && <div>Ref: {p.referenceNumber}</div>}
                        {p.notes && <div style={{ fontSize: '11px' }}>{p.notes}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#15803D', fontSize: '14px' }}>
                        ₹{p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748B' }}>Page {page}</div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                color: page <= 1 ? '#94A3B8' : '#334155',
                fontSize: '13px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasMore}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: !hasMore ? '#F1F5F9' : '#FFFFFF',
                color: !hasMore ? '#94A3B8' : '#334155',
                fontSize: '13px',
                cursor: !hasMore ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OrderFormModal
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
        onOrderCreated={() => {
          void fetchOrdersList();
        }}
      />

      <OrderDetailModal
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        orderId={selectedOrderId}
        onOrderUpdated={() => {
          void fetchOrdersList();
        }}
        onCreateDispatch={(orderId) => {
          setSelectedOrderId(null);
          handleOpenDispatchForOrder(orderId);
        }}
        onRecordPayment={(orderId) => {
          setSelectedOrderId(null);
          handleOpenPaymentForOrder(orderId);
        }}
        onViewDispatch={(dispatchId) => {
          setSelectedOrderId(null);
          setSelectedDispatchId(dispatchId);
        }}
      />

      <DispatchFormModal
        isOpen={isDispatchFormOpen}
        onClose={() => {
          setIsDispatchFormOpen(false);
          setDispatchPreselectedOrderId(undefined);
        }}
        orderId={dispatchPreselectedOrderId}
        onDispatchCreated={() => {
          void fetchDispatchesList();
          void fetchOrdersList();
        }}
      />

      <DispatchDetailModal
        isOpen={!!selectedDispatchId}
        onClose={() => setSelectedDispatchId(null)}
        dispatchId={selectedDispatchId}
        onViewOrder={(orderId) => {
          setSelectedDispatchId(null);
          setSelectedOrderId(orderId);
        }}
      />

      <PaymentFormModal
        isOpen={isPaymentFormOpen}
        onClose={() => {
          setIsPaymentFormOpen(false);
          setPaymentPreselectedOrderId(undefined);
        }}
        orderId={paymentPreselectedOrderId}
        onPaymentRecorded={() => {
          void fetchPaymentsList();
          void fetchOrdersList();
        }}
      />
    </div>
  );
};
