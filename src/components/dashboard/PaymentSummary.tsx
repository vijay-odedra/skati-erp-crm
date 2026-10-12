import React from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { PaymentSummaryData } from '../../services/dashboard/dashboardTypes.ts';

interface PaymentSummaryProps {
  data?: PaymentSummaryData;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({ data }) => {
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
          <IndianRupee size={18} color="#087EA4" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            Payment & Collections
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
          <span>Orders Ledger</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Metric Cards */}
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
              backgroundColor: data.totalPendingPaymentAmount > 0 ? '#FFFBEB' : '#F8FAFC',
              borderRadius: '8px',
              border: `1px solid ${data.totalPendingPaymentAmount > 0 ? '#FED7AA' : '#E2E8F0'}`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: data.totalPendingPaymentAmount > 0 ? '#B45309' : '#64748B',
              }}
            >
              PENDING RECEIVABLES
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: data.totalPendingPaymentAmount > 0 ? '#B45309' : '#0F2942',
                marginTop: '2px',
              }}
            >
              ₹
              {data.totalPendingPaymentAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              {data.ordersWithPendingPaymentCount} orders pending
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              border: '1px solid #BBF7D0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#15803D' }}>
              COLLECTIONS (PERIOD)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '2px' }}>
              ₹
              {data.paymentsReceivedPeriodAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
              {data.recentPayments.length} transactions
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {data.recentPayments && data.recentPayments.length > 0 ? (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Recent Collections
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.recentPayments.slice(0, 5).map((pay) => (
                <div
                  key={pay.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F2942' }}>
                      {pay.orderCodeSnapshot || pay.paymentCode}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      via {(pay.paymentMethod || (pay as unknown as { mode?: string }).mode || 'BANK_TRANSFER').replace(/_/g, ' ')} {pay.referenceNumber ? `(${pay.referenceNumber})` : ''}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#15803D' }}>
                    +₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>No payment records found for the selected date range.</span>
          </div>
        )}
      </div>
    </div>
  );
};
