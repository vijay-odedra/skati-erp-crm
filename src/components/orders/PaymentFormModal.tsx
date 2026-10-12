import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import type { Order, PaymentMethod } from '../../services/orders/orderTypes.ts';
import { PAYMENT_METHOD_LABELS } from '../../constants/orders.ts';
import { getOrders, getOrder } from '../../services/orders/orders.ts';
import { recordPayment } from '../../services/orders/payments.ts';
import { useAuth } from '../../hooks/useAuth.ts';

export interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  order?: Order;
  onSuccess?: () => void;
  onPaymentRecorded?: () => void;
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  orderId: initialOrderId,
  order: propOrder,
  onSuccess,
  onPaymentRecorded,
}) => {
  const { user } = useAuth();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || propOrder?.id || '');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(propOrder || null);

  const pendingAmount = currentOrder
    ? currentOrder.pendingAmount !== undefined
      ? currentOrder.pendingAmount
      : currentOrder.grandTotal - (currentOrder.paidAmount || 0)
    : 0;

  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orders if needed
  useEffect(() => {
    if (!isOpen) return;
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
      getOrder(initialOrderId).then((ord) => {
        if (ord) {
          setCurrentOrder(ord);
          const p = ord.pendingAmount !== undefined ? ord.pendingAmount : ord.grandTotal - (ord.paidAmount || 0);
          setAmount(p > 0 ? p : 0);
        }
      }).catch(console.error);
    } else if (propOrder) {
      setSelectedOrderId(propOrder.id);
      setCurrentOrder(propOrder);
      const p = propOrder.pendingAmount !== undefined ? propOrder.pendingAmount : propOrder.grandTotal - (propOrder.paidAmount || 0);
      setAmount(p > 0 ? p : 0);
    } else {
      setLoadingOrders(true);
      getOrders({ status: 'ALL', pageSize: 100 })
        .then((res) => {
          const unpaid = res.items.filter((o) => o.pendingAmount > 0 && o.status !== 'CANCELLED');
          setAvailableOrders(unpaid);
          if (unpaid.length > 0 && !selectedOrderId) {
            setSelectedOrderId(unpaid[0].id);
            setCurrentOrder(unpaid[0]);
            const p = unpaid[0].pendingAmount !== undefined ? unpaid[0].pendingAmount : unpaid[0].grandTotal - (unpaid[0].paidAmount || 0);
            setAmount(p > 0 ? p : 0);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingOrders(false));
    }
  }, [isOpen, initialOrderId, propOrder, selectedOrderId]);

  // When selectedOrderId changes from dropdown
  const handleSelectOrder = (oId: string) => {
    setSelectedOrderId(oId);
    const found = availableOrders.find((o) => o.id === oId);
    if (found) {
      setCurrentOrder(found);
      const p = found.pendingAmount !== undefined ? found.pendingAmount : found.grandTotal - (found.paidAmount || 0);
      setAmount(p > 0 ? p : 0);
    } else if (oId) {
      getOrder(oId).then((ord) => {
        if (ord) {
          setCurrentOrder(ord);
          const p = ord.pendingAmount !== undefined ? ord.pendingAmount : ord.grandTotal - (ord.paidAmount || 0);
          setAmount(p > 0 ? p : 0);
        }
      }).catch(console.error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOrderId || !currentOrder) {
      setError('Please select an order to apply payment.');
      return;
    }

    const enteredAmount = Number(amount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (enteredAmount > pendingAmount + 0.01) {
      setError(
        `Payment amount (₹${enteredAmount.toFixed(2)}) exceeds remaining balance of ₹${pendingAmount.toFixed(2)}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment(
        {
          orderId: selectedOrderId,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: enteredAmount,
          paymentMethod,
          referenceNumber,
          notes,
        },
        user?.email || 'sales_employee'
      );

      if (onSuccess) onSuccess();
      if (onPaymentRecorded) onPaymentRecorded();
      onClose();
    } catch (err: unknown) {
      console.error('Record payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
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
          maxWidth: '560px',
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
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                Record Customer Payment
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                {currentOrder
                  ? `For Order: ${currentOrder.orderCode} (${currentOrder.customerNameSnapshot})`
                  : 'Record client receipt against sales order'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
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

            {/* Order Selector (if not fixed) */}
            {!initialOrderId && !propOrder && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Select Sales Order <span style={{ color: '#EF4444' }}>*</span>
                </label>
                {loadingOrders ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Loading outstanding orders...</div>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => handleSelectOrder(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '14px',
                      color: '#0F2942',
                      outline: 'none',
                    }}
                    required
                  >
                    <option value="">-- Choose Sales Order --</option>
                    {availableOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderCode} — {o.customerNameSnapshot} (Due: ₹{o.pendingAmount.toFixed(2)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Financial Overview Card */}
            {currentOrder && (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '14px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Total Order</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F2942', marginTop: '2px' }}>
                    ₹{currentOrder.grandTotal.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase', fontWeight: 600 }}>Already Paid</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803D', marginTop: '2px' }}>
                    ₹{(currentOrder.paidAmount || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#92400E', textTransform: 'uppercase', fontWeight: 600 }}>Remaining Due</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#B45309', marginTop: '2px' }}>
                    ₹{pendingAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Date & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Payment Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Amount (₹) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="number"
                  min={0.01}
                  max={pendingAmount > 0 ? pendingAmount : undefined}
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F2942',
                  }}
                  required
                />
              </div>
            </div>

            {/* Payment Method & Reference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Payment Method <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                    backgroundColor: '#FFFFFF',
                  }}
                  required
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Transaction / Cheque / UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98273615 / CHQ-10029"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Notes / Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Bank name, payment acknowledgment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F2942',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || amount <= 0}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: amount > 0 ? '#D97706' : '#94A3B8',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: amount > 0 && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Recording Payment...' : `Record Receipt (₹${amount.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
