import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import type { OrderSummaryData } from '../../services/dashboard/dashboardTypes.ts';

interface OrderSummaryProps {
  data?: OrderSummaryData;
}

const STATUS_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  CONFIRMED: { bg: '#E0F2FE', text: '#0369A1' },
  IN_PRODUCTION: { bg: '#FEF3C7', text: '#92400E' },
  READY_TO_DISPATCH: { bg: '#EDE9FE', text: '#6D28D9' },
  PARTIALLY_DISPATCHED: { bg: '#FFEDD5', text: '#C2410C' },
  DISPATCHED: { bg: '#DCFCE7', text: '#15803D' },
  COMPLETED: { bg: '#F1F5F9', text: '#475569' },
  CANCELLED: { bg: '#FEE2E2', text: '#B91C1C' },
};

export const OrderSummary: React.FC<OrderSummaryProps> = ({ data }) => {
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
          <ShoppingCart size={18} color="#087EA4" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            Orders & Fulfillment
          </h3>
        </div>
        <Link
          to="/orders"
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
          <span>All Orders</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Status Counts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Pending</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F2942' }}>
              {data.pendingOrdersCount}
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: '#FFFBEB', borderRadius: '6px', border: '1px solid #FED7AA' }}>
            <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 500 }}>In Production</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#B45309' }}>
              {data.inProductionOrdersCount}
            </div>
          </div>

          <div style={{ padding: '8px 10px', backgroundColor: '#FAF5FF', borderRadius: '6px', border: '1px solid #E9D5FF' }}>
            <div style={{ fontSize: '11px', color: '#6B21A8', fontWeight: 500 }}>Ready / Dispatch</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#7E22CE' }}>
              {data.readyToDispatchOrdersCount + data.partiallyDispatchedOrdersCount}
            </div>
          </div>

          <div
            style={{
              padding: '8px 10px',
              backgroundColor: data.overdueOrdersCount > 0 ? '#FEF2F2' : '#F8FAFC',
              borderRadius: '6px',
              border: `1px solid ${data.overdueOrdersCount > 0 ? '#FECACA' : '#E2E8F0'}`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: data.overdueOrdersCount > 0 ? '#991B1B' : '#64748B',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {data.overdueOrdersCount > 0 && <AlertCircle size={12} />}
              <span>Overdue</span>
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: data.overdueOrdersCount > 0 ? '#DC2626' : '#0F2942',
              }}
            >
              {data.overdueOrdersCount}
            </div>
          </div>
        </div>

        {/* Recent Active Orders */}
        {data.recentOrders && data.recentOrders.length > 0 ? (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Recent Orders
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentOrders.slice(0, 5).map((order) => {
                const badge = STATUS_BADGE_STYLE[order.status] || { bg: '#F1F5F9', text: '#475569' };
                const paymentStatus =
                  order.paidAmount >= order.grandTotal
                    ? 'PAID'
                    : order.paidAmount > 0
                    ? 'PARTIALLY_PAID'
                    : 'PENDING';

                return (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #F1F5F9',
                      backgroundColor: '#FAFAFA',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          to={`/orders/${order.id}`}
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: '#087EA4',
                            textDecoration: 'none',
                          }}
                        >
                          {order.orderCode}
                        </Link>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: badge.bg,
                            color: badge.text,
                          }}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        {order.customerNameSnapshot} • ₹{order.grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            paymentStatus === 'PAID'
                              ? '#DCFCE7'
                              : paymentStatus === 'PARTIALLY_PAID'
                              ? '#FEF3C7'
                              : '#FEE2E2',
                          color:
                            paymentStatus === 'PAID'
                              ? '#15803D'
                              : paymentStatus === 'PARTIALLY_PAID'
                              ? '#B45309'
                              : '#B91C1C',
                        }}
                      >
                        {paymentStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} />
            <span>No orders recorded in the current period.</span>
          </div>
        )}
      </div>
    </div>
  );
};
