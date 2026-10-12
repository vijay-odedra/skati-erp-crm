import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Truck,
  AlertCircle,
  Package,
} from 'lucide-react';
import type { Order, OrderItem } from '../../services/orders/orderTypes.ts';
import type { FinishedProductStock } from '../../services/production/productionTypes.ts';
import { getFinishedProductStock } from '../../services/inventory/finishedProductStock.ts';
import { getOrders, getOrderDetails } from '../../services/orders/orders.ts';
import { executeDispatch } from '../../services/orders/dispatchExecution.ts';
import { useAuth } from '../../hooks/useAuth.ts';

export interface DispatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  order?: Order;
  items?: OrderItem[];
  onSuccess?: () => void;
  onDispatchCreated?: () => void;
}

interface DispatchLineItem {
  orderItemId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  orderedQuantity: number;
  dispatchedQuantity: number;
  pendingDispatchQuantity: number;
  availableStock: number;
  dispatchQuantity: number;
}

export const DispatchFormModal: React.FC<DispatchFormModalProps> = ({
  isOpen,
  onClose,
  orderId: initialOrderId,
  order: propOrder,
  items: propItems,
  onSuccess,
  onDispatchCreated,
}) => {
  const { user } = useAuth();

  // Selected Order State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || propOrder?.id || '');
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(propOrder || null);

  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [dispatchLines, setDispatchLines] = useState<DispatchLineItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load eligible orders if not fixed
  useEffect(() => {
    if (!isOpen) return;
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
    } else if (propOrder) {
      setSelectedOrderId(propOrder.id);
      setCurrentOrder(propOrder);
    } else {
      setLoadingOrders(true);
      getOrders({ status: 'ALL', pageSize: 100 })
        .then((res) => {
          const eligible = res.items.filter((o) =>
            ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'PARTIALLY_DISPATCHED'].includes(o.status)
          );
          setAvailableOrders(eligible);
          if (eligible.length > 0 && !selectedOrderId) {
            setSelectedOrderId(eligible[0].id);
          }
        })
        .catch((err: unknown) => console.error('Error fetching orders for dispatch:', err))
        .finally(() => setLoadingOrders(false));
    }
  }, [isOpen, initialOrderId, propOrder, propItems, selectedOrderId]);

  // Load order details when selectedOrderId changes
  const loadOrderAndStock = useCallback(async (oId: string) => {
    if (!oId) return;
    try {
      setLoadingDetails(true);
      setError(null);
      const details = await getOrderDetails(oId);
      if (!details) {
        setError('Order details could not be found.');
        return;
      }
      setCurrentOrder(details.order);

      const lines: DispatchLineItem[] = [];
      for (const item of details.items) {
        const pending = item.pendingDispatchQuantity !== undefined
          ? item.pendingDispatchQuantity
          : Math.max(0, item.orderedQuantity - (item.dispatchedQuantity || 0));

        let stock = 0;
        try {
          const fStock: FinishedProductStock | null = await getFinishedProductStock(item.productId);
          if (fStock) stock = fStock.currentStock;
        } catch (e) {
          console.warn('Could not fetch stock for', item.productId, e);
        }

        const initialQty = Math.min(pending, stock);
        lines.push({
          orderItemId: item.id,
          productId: item.productId,
          productName: item.productNameSnapshot,
          productCode: item.productCodeSnapshot,
          unit: item.unit,
          orderedQuantity: item.orderedQuantity,
          dispatchedQuantity: item.dispatchedQuantity || 0,
          pendingDispatchQuantity: pending,
          availableStock: stock,
          dispatchQuantity: initialQty,
        });
      }
      setDispatchLines(lines);
    } catch (err: unknown) {
      console.error('Error fetching order details for dispatch:', err);
      setError('Failed to load order items.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedOrderId) {
      void loadOrderAndStock(selectedOrderId);
    }
  }, [isOpen, selectedOrderId, loadOrderAndStock]);

  if (!isOpen) return null;

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...dispatchLines];
    updated[index].dispatchQuantity = Math.max(0, val);
    setDispatchLines(updated);
  };

  const totalDispatchQty = dispatchLines.reduce((acc, curr) => acc + (curr.dispatchQuantity || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOrderId || !currentOrder) {
      setError('Please select an order to dispatch.');
      return;
    }

    const itemsToDispatch = dispatchLines.filter((l) => l.dispatchQuantity > 0);
    if (itemsToDispatch.length === 0) {
      setError('Please specify at least one product quantity greater than zero to dispatch.');
      return;
    }

    for (const line of itemsToDispatch) {
      if (line.dispatchQuantity > line.pendingDispatchQuantity) {
        setError(
          `Cannot dispatch ${line.dispatchQuantity} of "${line.productName}". Maximum pending dispatch is ${line.pendingDispatchQuantity}.`
        );
        return;
      }
      if (line.dispatchQuantity > line.availableStock) {
        setError(
          `Cannot dispatch ${line.dispatchQuantity} of "${line.productName}". Available finished stock is only ${line.availableStock}.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await executeDispatch(
        {
          orderId: selectedOrderId,
          dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
          deliveryAddress,
          vehicleNumber,
          transporter,
          trackingNumber,
          notes,
          items: itemsToDispatch.map((l) => ({
            orderItemId: l.orderItemId,
            productId: l.productId,
            quantity: l.dispatchQuantity,
          })),
        },
        user?.email || 'sales_employee'
      );

      if (onSuccess) onSuccess();
      if (onDispatchCreated) onDispatchCreated();
      onClose();
    } catch (err: unknown) {
      console.error('Dispatch execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute dispatch.');
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
          maxWidth: '880px',
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                Create Dispatch / Shipment
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                {currentOrder
                  ? `Fulfill Order: ${currentOrder.orderCode} (${currentOrder.customerNameSnapshot})`
                  : 'Select an active sales order to dispatch goods'}
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  <div style={{ fontSize: '13px', color: '#64748B' }}>Loading active sales orders...</div>
                ) : (
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
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
                    <option value="">-- Choose Order to Dispatch --</option>
                    {availableOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderCode} — {o.customerNameSnapshot} (Status: {o.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Logistics details row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Dispatch Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
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
                  Transporter / Courier
                </label>
                <input
                  type="text"
                  placeholder="e.g. V-Trans / Self / DTDC"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Vehicle / L.R. No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. GJ-01-AB-1234 / LR-9988"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
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

            {/* Tracking Number & Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Tracking Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. TRK-872615"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Delivery Destination Address
                </label>
                <input
                  type="text"
                  placeholder="Delivery Address / Site location"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
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

            {/* Items Dispatched Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="#059669" />
                  <span>Order Items &amp; Finished Goods Allocation</span>
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Total to Dispatch: <strong style={{ color: '#059669' }}>{totalDispatchQty} units</strong>
                </span>
              </div>

              {loadingDetails ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                  Checking available stock and line items...
                </div>
              ) : dispatchLines.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                  No pending items for this order.
                </div>
              ) : (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Product</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Ordered</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Already Dispatched</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Pending Dispatch</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Available Finished Stock</th>
                        <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right', width: '140px' }}>Dispatch Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatchLines.map((line, idx) => {
                        const isStockLow = line.availableStock < line.pendingDispatchQuantity;
                        return (
                          <tr key={line.orderItemId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#0F2942' }}>{line.productName}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{line.productCode}</div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748B' }}>
                              {line.orderedQuantity} {line.unit}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#64748B' }}>
                              {line.dispatchedQuantity} {line.unit}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                              {line.pendingDispatchQuantity} {line.unit}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: isStockLow ? '#DC2626' : '#15803D' }}>
                              {line.availableStock} {line.unit}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <input
                                type="number"
                                min={0}
                                max={Math.min(line.pendingDispatchQuantity, line.availableStock)}
                                step={line.unit === 'piece' ? '1' : '0.01'}
                                value={line.dispatchQuantity}
                                onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                style={{
                                  width: '100px',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: '#0F2942',
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Dispatch / Gate Pass Notes
              </label>
              <textarea
                rows={2}
                placeholder="Driver details, LR notes, packaging remarks..."
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
              disabled={submitting || totalDispatchQty === 0}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: totalDispatchQty > 0 ? '#059669' : '#94A3B8',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: totalDispatchQty > 0 && !submitting ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Executing Dispatch...' : `Confirm & Dispatch (${totalDispatchQty} units)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
