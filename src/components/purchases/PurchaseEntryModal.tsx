import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  ShoppingBag,
  CheckCircle,
} from 'lucide-react';
import type { Supplier, CreatePurchaseItemInput } from '../../services/purchases/purchaseTypes.ts';
import type { RawMaterial } from '../../services/inventory/inventoryTypes.ts';
import { getSuppliers } from '../../services/purchases/suppliers.ts';
import { getRawMaterials } from '../../services/inventory/rawMaterials.ts';
import { executePurchaseInward } from '../../services/purchases/purchaseExecution.ts';
import { TAX_RATES } from '../../constants/purchases.ts';
import { getUnitLabel } from '../../constants/inventory.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface PurchaseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchaseId: string) => void;
}

interface EditableLineItem {
  key: string;
  rawMaterialId: string;
  quantity: string;
  unitPrice: string;
  taxRatePercent: number;
}

export const PurchaseEntryModal: React.FC<PurchaseEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Line items state
  const [items, setItems] = useState<EditableLineItem[]>([
    {
      key: 'initial-line-1',
      rawMaterialId: '',
      quantity: '',
      unitPrice: '',
      taxRatePercent: 18,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Suppliers and Active Raw Materials
  useEffect(() => {
    if (!isOpen) return;

    const loadLookups = async () => {
      try {
        setLoadingLookups(true);
        setError(null);

        const [supRes, rmRes] = await Promise.all([
          getSuppliers({ activeStatus: 'ACTIVE', pageSize: 200 }),
          getRawMaterials({ activeStatus: 'ACTIVE', pageSize: 200 }),
        ]);

        setSuppliers(supRes.items);
        setRawMaterials(rmRes.items);
      } catch (err: unknown) {
        console.error('Error loading lookup data:', err);
        setError('Failed to load suppliers or raw materials list.');
      } finally {
        setLoadingLookups(false);
      }
    };

    void loadLookups();
  }, [isOpen]);

  // Raw material lookup map
  const rawMaterialMap = useMemo(() => {
    const map = new Map<string, RawMaterial>();
    for (const rm of rawMaterials) {
      map.set(rm.id, rm);
    }
    return map;
  }, [rawMaterials]);

  // Add line item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: Math.random().toString(),
        rawMaterialId: '',
        quantity: '',
        unitPrice: '',
        taxRatePercent: 18,
      },
    ]);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const handleItemChange = (index: number, field: keyof EditableLineItem, val: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const taxRate = item.taxRatePercent || 0;

      const subtotal = Math.round(qty * price * 100) / 100;
      const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
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
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalTax = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal,
    };
  }, [calculatedItems]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be authenticated to record purchases.');
      return;
    }

    if (!selectedSupplierId) {
      setError('Please select a supplier.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one raw material line item.');
      return;
    }

    // Validate duplicate raw materials
    const selectedRMs = new Set<string>();
    const preparedItems: CreatePurchaseItemInput[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.rawMaterialId) {
        setError(`Please select a raw material for Item #${i + 1}.`);
        return;
      }

      if (selectedRMs.has(item.rawMaterialId)) {
        const dupName = rawMaterialMap.get(item.rawMaterialId)?.name || 'material';
        setError(`Duplicate item: "${dupName}" is added more than once. Combine the quantity into one line.`);
        return;
      }
      selectedRMs.add(item.rawMaterialId);

      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        setError(`Please enter a valid positive quantity for Item #${i + 1}.`);
        return;
      }

      const rm = rawMaterialMap.get(item.rawMaterialId);
      if (rm && rm.unit === 'piece' && !Number.isInteger(qty)) {
        setError(`Quantity for piece-based item "${rm.name}" must be an integer.`);
        return;
      }

      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        setError(`Please enter a valid unit price for Item #${i + 1}.`);
        return;
      }

      preparedItems.push({
        rawMaterialId: item.rawMaterialId,
        quantity: qty,
        unitPrice,
        taxRate: item.taxRatePercent || 0,
      });
    }

    try {
      setSubmitting(true);
      const purchase = await executePurchaseInward(
        {
          supplierId: selectedSupplierId,
          invoiceNumber: invoiceNumber.trim() || undefined,
          purchaseDate: invoiceDate ? new Date(invoiceDate) : undefined,
          notes: notes.trim() || undefined,
          items: preparedItems,
        },
        user.uid
      );

      onSuccess(purchase.id);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to inward purchase:', err);
      setError(err instanceof Error ? err.message : 'Failed to record purchase entry.');
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                Purchase Inward Entry
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Receive raw materials from vendor, atomically increment inventory stock, and log audit trail
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

        {/* Form */}
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

            {/* Supplier & Invoice Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: '16px',
                backgroundColor: '#F8FAFC',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Supplier <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  disabled={loadingLookups}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose Active Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplierCode}) {s.city ? `— ${s.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Vendor Invoice No.
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-089"
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
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
            </div>

            {/* Line Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                  Raw Materials Received ({items.length} {items.length === 1 ? 'item' : 'items'})
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
                        Raw Material
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '130px' }}>
                        Quantity
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '130px' }}>
                        Unit Price (₹)
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '100px' }}>
                        Tax Rate
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '140px', textAlign: 'right' }}>
                        Line Total (₹)
                      </th>
                      <th style={{ padding: '10px 14px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const selectedRM = rawMaterialMap.get(item.rawMaterialId);
                      const calc = calculatedItems[index];

                      return (
                        <tr key={item.key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          {/* Raw Material Select */}
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              required
                              value={item.rawMaterialId}
                              onChange={(e) => handleItemChange(index, 'rawMaterialId', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                backgroundColor: '#FFFFFF',
                                outline: 'none',
                              }}
                            >
                              <option value="">-- Choose Material --</option>
                              {rawMaterials.map((rm) => (
                                <option key={rm.id} value={rm.id}>
                                  {rm.name} ({rm.materialCode}) — [{getUnitLabel(rm.unit)}] (Stock: {rm.currentStock})
                                </option>
                              ))}
                            </select>
                            {selectedRM && (
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                Unit: <strong>{getUnitLabel(selectedRM.unit)}</strong> | In-stock: {selectedRM.currentStock}
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td style={{ padding: '10px 14px' }}>
                            <input
                              type="number"
                              required
                              min="0.001"
                              step={selectedRM?.unit === 'piece' ? '1' : '0.01'}
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                outline: 'none',
                              }}
                            />
                          </td>

                          {/* Unit Price */}
                          <td style={{ padding: '10px 14px' }}>
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
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
                                outline: 'none',
                              }}
                            />
                          </td>

                          {/* Tax Rate */}
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={item.taxRatePercent}
                              onChange={(e) => handleItemChange(index, 'taxRatePercent', parseFloat(e.target.value) || 0)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                fontSize: '13px',
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

                          {/* Computed Line Total */}
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                              ₹{calc?.lineTotal ? calc.lineTotal.toFixed(2) : '0.00'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              Tax: ₹{calc?.taxAmount ? calc.taxAmount.toFixed(2) : '0.00'}
                            </div>
                          </td>

                          {/* Delete Action */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '4px',
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

            {/* Financial Summary & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Purchase Notes / Delivery Remarks
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate inward entry number, vehicle number, batch inspection notes..."
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

                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#166534',
                    fontSize: '12px',
                  }}
                >
                  <CheckCircle size={15} color="#16A34A" />
                  <span>
                    Upon saving, raw material current stock will automatically increase by the entered quantities in a single atomic transaction.
                  </span>
                </div>
              </div>

              {/* Order Totals Box */}
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
                  <span>Subtotal (Before Tax):</span>
                  <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{summary.subtotal.toFixed(2)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B' }}>
                  <span>Total Tax (GST):</span>
                  <span style={{ fontWeight: 500, color: '#0F2942' }}>₹{summary.totalTax.toFixed(2)}</span>
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

          {/* Footer Actions */}
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
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 22px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              {submitting ? 'Executing Inward...' : 'Confirm Inward & Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
