import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { Customer } from '../../services/crm/crmTypes.ts';
import type { Product } from '../../services/products/productTypes.ts';
import { getCustomers } from '../../services/crm/customers.ts';
import { getProducts } from '../../services/products/products.ts';
import { createOrder } from '../../services/orders/orderExecution.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOrderCreated?: () => void;
}

interface FormOrderItem {
  productId: string;
  orderedQuantity: number;
  unitPrice: number;
  taxRate: number;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOrderCreated,
}) => {
  const { user } = useAuth();

  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<FormOrderItem[]>([
    { productId: '', orderedQuantity: 1, unitPrice: 0, taxRate: 18 },
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadLookups = async () => {
      try {
        setLoadingLookups(true);
        const [cRes, pRes] = await Promise.all([
          getCustomers({ activeStatus: 'ACTIVE', pageSize: 100 }),
          getProducts({ activeStatus: 'ACTIVE', pageSize: 100 }),
        ]);
        setCustomers(cRes.items);
        setProducts(pRes.items);
      } catch (err: unknown) {
        console.error('Failed to load lookup data:', err);
        setError('Failed to load customers or products.');
      } finally {
        setLoadingLookups(false);
      }
    };
    void loadLookups();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProductChange = (index: number, pId: string) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: pId,
      unitPrice: 0,
      taxRate: 18,
    };
    setItems(updated);
  };

  const handleQuantityChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].orderedQuantity = Math.max(0, val);
    setItems(updated);
  };

  const handlePriceChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].unitPrice = Math.max(0, val);
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', orderedQuantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedItems = items.map((it) => {
    const lineSubtotal = Number((it.orderedQuantity * it.unitPrice).toFixed(2));
    const taxAmount = Number((lineSubtotal * (it.taxRate / 100)).toFixed(2));
    const lineTotal = Number((lineSubtotal + taxAmount).toFixed(2));
    return { lineSubtotal, taxAmount, lineTotal };
  });

  const subtotal = Number(calculatedItems.reduce((acc, curr) => acc + curr.lineSubtotal, 0).toFixed(2));
  const totalTax = Number(calculatedItems.reduce((acc, curr) => acc + curr.taxAmount, 0).toFixed(2));
  const discount = Number((discountAmount || 0).toFixed(2));
  const grandTotal = Number((subtotal + totalTax - discount).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer account.');
      return;
    }

    if (items.some((i) => !i.productId || i.orderedQuantity <= 0)) {
      setError('All items must have a valid product and quantity greater than zero.');
      return;
    }

    const seenProducts = new Set<string>();
    for (const it of items) {
      if (seenProducts.has(it.productId)) {
        setError('Duplicate products in order lines are not allowed.');
        return;
      }
      seenProducts.add(it.productId);
    }

    try {
      setSubmitting(true);
      await createOrder(
        {
          customerId,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          items: items.map((it) => ({
            productId: it.productId,
            orderedQuantity: it.orderedQuantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
          })),
          discountAmount: discount,
          notes,
        },
        user?.email || 'sales_employee'
      );

      if (onSuccess) onSuccess();
      if (onOrderCreated) onOrderCreated();
      onClose();
    } catch (err: unknown) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create sales order.');
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
          maxWidth: '860px',
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
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                Create Sales Order
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Generate confirmed commercial sales order with delivery schedule
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#991B1B',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Customer & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Customer Account <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={loadingLookups}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.customerCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Order Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Expected Delivery Date
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Calendar size={16} color="#94A3B8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0F2942' }}>
                  Ordered Products &amp; Pricing Schedule <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #087EA4',
                    backgroundColor: '#F0F9FF',
                    color: '#087EA4',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                  <span>Add Line</span>
                </button>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '38%' }}>Product</th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '16%' }}>Qty</th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '18%' }}>Price (₹)</th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '12%' }}>GST %</th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '16%', textAlign: 'right' }}>Total (₹)</th>
                      <th style={{ padding: '10px 8px', width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const selProd = products.find((p) => p.id === it.productId);
                      const calc = calculatedItems[idx];
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 14px' }}>
                            <select
                              required
                              value={it.productId}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <option value="">-- Select Product --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.productCode}) [{p.unit}]
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min={selProd?.unit === 'piece' ? 1 : 0.01}
                                step={selProd?.unit === 'piece' ? 1 : 0.01}
                                required
                                value={it.orderedQuantity || ''}
                                onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '13px',
                                  boxSizing: 'border-box',
                                }}
                              />
                              <span style={{ fontSize: '12px', color: '#64748B' }}>{selProd?.unit || 'unit'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              required
                              value={it.unitPrice || ''}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value))}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 14px' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={it.taxRate}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].taxRate = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                            ₹{calc?.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '2px',
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Order Notes &amp; Terms
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special packaging, dispatch instructions, billing remarks..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                  <span>Taxable Subtotal:</span>
                  <span style={{ fontWeight: 600, color: '#0F2942' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                  <span>Total GST Tax:</span>
                  <span style={{ fontWeight: 600, color: '#0F2942' }}>₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B' }}>Discount (₹):</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '120px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      textAlign: 'right',
                    }}
                  />
                </div>

                <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: '#0F2942' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#087EA4' }}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '14px',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingLookups}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Creating Order...' : 'Confirm Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
