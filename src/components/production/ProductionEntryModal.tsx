import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Factory,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { Product } from '../../services/products/productTypes.ts';
import type {
  CreateProductionInput,
  ProductionArea,
  ProductionPreviewResult,
} from '../../services/production/productionTypes.ts';
import {
  previewProduction,
  executeProductionBatch,
} from '../../services/production/productionExecution.ts';
import { getProducts } from '../../services/products/products.ts';
import { PRODUCTION_AREAS } from '../../constants/production.ts';
import { getProductUnitLabel } from '../../constants/products.ts';
import { getUnitLabel } from '../../constants/inventory.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface ProductionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductionEntryModal: React.FC<ProductionEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Active products list for selector
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityInput, setQuantityInput] = useState('');
  const [productionArea, setProductionArea] = useState<ProductionArea>('GROUND_FLOOR');
  const [notes, setNotes] = useState('');

  // Live Preview State
  const [preview, setPreview] = useState<ProductionPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch active products
  useEffect(() => {
    if (isOpen) {
      const loadProducts = async () => {
        try {
          setLoadingProducts(true);
          const res = await getProducts({ activeStatus: 'ACTIVE', pageSize: 50 });
          setActiveProducts(res.items);
          if (res.items.length > 0 && !selectedProductId) {
            setSelectedProductId(res.items[0].id);
          }
        } catch (err: unknown) {
          console.error('Failed to load products for production:', err);
        } finally {
          setLoadingProducts(false);
        }
      };
      void loadProducts();
    }
  }, [isOpen, selectedProductId]);

  // Compute live BOM calculation & stock availability
  const calculatePreview = useCallback(async () => {
    if (!selectedProductId || !quantityInput) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const qty = Number(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      setPreview(null);
      setPreviewError('Please enter a valid production quantity greater than zero.');
      return;
    }

    try {
      setLoadingPreview(true);
      setPreviewError(null);
      const res = await previewProduction(selectedProductId, qty, productionArea);
      setPreview(res);
    } catch (err: unknown) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : 'Failed to calculate production preview.');
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedProductId, quantityInput, productionArea]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void calculatePreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [calculatePreview]);

  if (!isOpen) return null;

  const selectedProduct = activeProducts.find((p) => p.id === selectedProductId);
  const isPieceUnit = selectedProduct?.unit === 'piece';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedProductId) {
      setSubmitError('Please select a product.');
      return;
    }

    const qty = Number(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Production quantity must be greater than zero.');
      return;
    }

    if (preview && !preview.isAllStockSufficient) {
      setSubmitError('Cannot proceed: Insufficient raw material inventory.');
      return;
    }

    try {
      setExecuting(true);
      const userUid = user?.uid || 'system';
      const input: CreateProductionInput = {
        productId: selectedProductId,
        quantityProduced: qty,
        productionArea,
        notes: notes.trim(),
      };

      await executeProductionBatch(input, userUid);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Production execution failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'An error occurred during production execution.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 41, 66, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D9EAF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFCFD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Factory size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F2942' }}>
                New Production Batch Entry
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Select product and enter output quantity — raw material consumption is calculated automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={executing}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {submitError && (
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
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Production Parameters Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr',
                gap: '16px',
                padding: '16px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
              }}
            >
              {/* Product Selector */}
              <div>
                <label
                  htmlFor="prod-product-select"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F2942',
                    marginBottom: '6px',
                  }}
                >
                  Finished Product <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  id="prod-product-select"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loadingProducts || executing}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  {loadingProducts ? (
                    <option>Loading products...</option>
                  ) : activeProducts.length === 0 ? (
                    <option>No active products found</option>
                  ) : (
                    activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.productCode} — {p.name} ({getProductUnitLabel(p.unit)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label
                  htmlFor="prod-qty-input"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F2942',
                    marginBottom: '6px',
                  }}
                >
                  Quantity ({selectedProduct ? getProductUnitLabel(selectedProduct.unit) : 'Unit'}) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="prod-qty-input"
                  type="number"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  placeholder={isPieceUnit ? 'e.g. 100' : 'e.g. 50.5'}
                  step={isPieceUnit ? '1' : '0.001'}
                  min="0.0001"
                  required
                  disabled={executing}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F2942',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Production Area */}
              <div>
                <label
                  htmlFor="prod-area-select"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F2942',
                    marginBottom: '6px',
                  }}
                >
                  Production Area <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  id="prod-area-select"
                  value={productionArea}
                  onChange={(e) => setProductionArea(e.target.value as ProductionArea)}
                  disabled={executing}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#0F2942',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  {PRODUCTION_AREAS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label} ({a.description})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="prod-notes-input"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748B',
                  marginBottom: '4px',
                }}
              >
                Production Notes (Optional)
              </label>
              <input
                id="prod-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Batch run #4, shift 1, standard spec"
                disabled={executing}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F2942',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Live BOM Stock Calculation Preview */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} color="#087EA4" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                    Calculated Raw Material Consumption &amp; Stock Availability
                  </span>
                </div>

                {preview && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: preview.isAllStockSufficient ? '#DCFCE7' : '#FEE2E2',
                      color: preview.isAllStockSufficient ? '#16A34A' : '#DC2626',
                      border: `1px solid ${preview.isAllStockSufficient ? '#BBF7D0' : '#FECACA'}`,
                    }}
                  >
                    {preview.isAllStockSufficient
                      ? 'Stock Available'
                      : 'Insufficient Inventory'}
                  </span>
                )}
              </div>

              {loadingPreview ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  Calculating required materials and validating inventory...
                </div>
              ) : previewError ? (
                <div
                  style={{
                    padding: '16px',
                    color: '#B45309',
                    backgroundColor: '#FFFBEB',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{previewError}</span>
                </div>
              ) : !preview ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                  Select a product and enter quantity to compute raw material requirements.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Raw Material</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Qty / Product</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Total Required</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Current Stock</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.materials.map((m) => (
                      <tr
                        key={m.rawMaterialId}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: m.isSufficient ? '#FFFFFF' : '#FEF2F2',
                        }}
                      >
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontWeight: 600, color: '#087EA4' }}>{m.materialCode}</span>
                          <span style={{ color: '#64748B' }}> — </span>
                          <span style={{ fontWeight: 500, color: '#0F2942' }}>{m.materialName}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>
                          {m.quantityPerProduct} {getUnitLabel(m.unit)}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0F2942' }}>
                          {m.requiredQuantity} {getUnitLabel(m.unit)}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569' }}>
                          {m.availableStock} {getUnitLabel(m.unit)}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {m.isSufficient ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#16A34A',
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Sufficient</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#DC2626',
                                fontWeight: 600,
                              }}
                            >
                              <AlertCircle size={14} />
                              <span>Shortage: -{m.shortageQuantity} {m.unit}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#FAFCFD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              {preview && selectedProduct && (
                <span>
                  Finished goods to add: <strong style={{ color: '#087EA4' }}>+{preview.quantityProduced} {getProductUnitLabel(selectedProduct.unit)}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={executing}
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
                disabled={executing || !preview || !preview.isAllStockSufficient}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#087EA4',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor:
                    executing || !preview || !preview.isAllStockSufficient
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: executing || !preview || !preview.isAllStockSufficient ? 0.6 : 1,
                }}
              >
                <span>{executing ? 'Executing Batch...' : 'Confirm Production'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
