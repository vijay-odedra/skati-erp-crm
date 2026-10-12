import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { Customer, CreateQuotationItemInput } from '../../services/crm/crmTypes.ts';
import type { Product } from '../../services/products/productTypes.ts';
import { getCustomers } from '../../services/crm/customers.ts';
import { getProducts } from '../../services/products/products.ts';
import { createQuotation } from '../../services/crm/quotations.ts';
import { TAX_RATES } from '../../constants/purchases.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quotationId: string) => void;
  defaultCustomer?: Customer | null;
}

interface EditableQuotationItem {
  key: string;
  productId: string;
  productName: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: number;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCustomer,
}) => {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustomer?.id || '');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('Prices are ex-factory. GST extra as applicable. Payment terms: 30 days.');

  const [items, setItems] = useState<EditableQuotationItem[]>([
    {
      key: 'line-1',
      productId: '',
      productName: '',
      description: '',
      quantity: '1',
      unit: 'piece',
      unitPrice: '',
      taxRate: 18,
    },
  ]);

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
        console.error('Error loading lookup options:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    void loadLookups();
  }, [isOpen]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `line-${Date.now()}-${Math.random()}`,
        productId: '',
        productName: '',
        description: '',
        quantity: '1',
        unit: 'piece',
        unitPrice: '',
        taxRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof EditableQuotationItem, val: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };

      // Auto-populate product name and unit if productId selected
      if (field === 'productId') {
        const prod = products.find((p) => p.id === val);
        if (prod) {
          next[index].productName = prod.name;
          next[index].unit = prod.unit;
        }
      }
      return next;
    });
  };

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const tax = item.taxRate || 0;

      const subtotal = Math.round(qty * price * 100) / 100;
      const taxAmount = Math.round(subtotal * (tax / 100) * 100) / 100;
      const lineTotal = Math.round((subtotal + taxAmount) * 100) / 100;

      return {
        ...item,
        qty,
        price,
        subtotal,
        taxAmount,
        lineTotal,
      };
    });
  }, [items]);

  const summary = useMemo(() => {
    const subtotal = calculatedItems.reduce((sum, it) => sum + it.subtotal, 0);
    const totalTax = calculatedItems.reduce((sum, it) => sum + it.taxAmount, 0);
    const discount = parseFloat(discountAmount) || 0;
    const grandTotal = Math.max(0, Math.round((subtotal + totalTax - discount) * 100) / 100);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      discount,
      grandTotal,
    };
  }, [calculatedItems, discountAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    if (!user) {
      setError('You must be authenticated.');
      return;
    }

    // Check duplicate products
    const selectedProdIds = new Set<string>();
    const preparedItems: CreateQuotationItemInput[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const pName = it.productName.trim();
      if (!pName) {
        setError(`Please provide a product/item name for Line #${i + 1}.`);
        return;
      }

      if (it.productId) {
        if (selectedProdIds.has(it.productId)) {
          setError(`Duplicate product: "${pName}" added multiple times. Combine quantities into one line.`);
          return;
        }
        selectedProdIds.add(it.productId);
      }

      const qty = parseFloat(it.quantity);
      if (isNaN(qty) || qty <= 0) {
        setError(`Please enter a valid positive quantity for Line #${i + 1}.`);
        return;
      }

      const unitPrice = parseFloat(it.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        setError(`Please enter a valid price for Line #${i + 1}.`);
        return;
      }

      preparedItems.push({
        productId: it.productId || undefined,
        productName: pName,
        description: it.description.trim() || undefined,
        quantity: qty,
        unit: it.unit.trim() || 'piece',
        unitPrice,
        taxRate: it.taxRate || 0,
      });
    }

    try {
      setSubmitting(true);
      const quotation = await createQuotation(
        {
          customerId: selectedCustomerId,
          quotationDate: new Date(quotationDate),
          validUntil: validUntil ? new Date(validUntil) : undefined,
          discountAmount: parseFloat(discountAmount) || 0,
          notes: notes.trim() || undefined,
          items: preparedItems,
        },
        user.uid
      );

      onSuccess(quotation.id);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create quotation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate quotation.');
    } finally {
      setSubmitting(false);
    }
  };

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
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                Prepare Commercial Quotation
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Generate official client quotation, line items, and GST tax schedule (QUO-XXXXXX)
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Select Customer <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  disabled={loadingLookups || Boolean(defaultCustomer)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: defaultCustomer ? '#F1F5F9' : '#FFFFFF',
                  }}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customerCode}) {c.companyName ? `— ${c.companyName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Quotation Date
                </label>
                <input
                  type="date"
                  required
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Line items table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                  Quotation Line Items ({items.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #087EA4',
                    backgroundColor: '#E0F2FE',
                    color: '#087EA4',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <tr>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                        Product / Custom Item
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '100px' }}>
                        Quantity
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '90px' }}>
                        Unit
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '120px' }}>
                        Unit Price (₹)
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '100px' }}>
                        Tax Rate
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '130px', textAlign: 'right' }}>
                        Line Total (₹)
                      </th>
                      <th style={{ padding: '10px 14px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const calc = calculatedItems[index];

                      return (
                        <tr key={item.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <select
                                value={item.productId}
                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '12px',
                                  backgroundColor: '#FFFFFF',
                                }}
                              >
                                <option value="">-- Choose Product Master (or type custom below) --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.productCode})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                required
                                placeholder="Item name / specification title"
                                value={item.productName}
                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '13px',
                                }}
                              />
                            </div>
                          </td>

                          <td style={{ padding: '8px 14px' }}>
                            <input
                              type="number"
                              required
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                              }}
                            />
                          </td>

                          <td style={{ padding: '8px 14px' }}>
                            <input
                              type="text"
                              required
                              value={item.unit}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                              }}
                            />
                          </td>

                          <td style={{ padding: '8px 14px' }}>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                              }}
                            />
                          </td>

                          <td style={{ padding: '8px 14px' }}>
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                              style={{
                                width: '100%',
                                padding: '5px 6px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                fontSize: '12px',
                                backgroundColor: '#FFFFFF',
                              }}
                            >
                              {TAX_RATES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td style={{ padding: '8px 14px', textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                              ₹{calc?.lineTotal ? calc.lineTotal.toFixed(2) : '0.00'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              Tax: ₹{calc?.taxAmount ? calc.taxAmount.toFixed(2) : '0.00'}
                            </div>
                          </td>

                          <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={15} />
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

            {/* Terms & Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Terms &amp; Conditions / Commercial Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

              {/* Totals Summary */}
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
                  <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{summary.subtotal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                  <span>GST Tax Total:</span>
                  <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{summary.totalTax.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748B' }}>
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    style={{
                      width: '90px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      textAlign: 'right',
                    }}
                  />
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
                  <span>₹{summary.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

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
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
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
              {submitting ? 'Creating Quotation...' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
