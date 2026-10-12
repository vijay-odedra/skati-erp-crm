import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type {
  Product,
  ProductCategory,
  ProductUnit,
  CreateProductInput,
  UpdateProductInput,
} from '../../services/products/productTypes.ts';
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../../constants/products.ts';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateProductInput | UpdateProductInput) => Promise<void>;
  productToEdit?: Product | null;
  hasBomItems?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  hasBomItems = false,
}) => {
  const isEditing = Boolean(productToEdit);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Industrial Filter');
  const [unit, setUnit] = useState<ProductUnit>('piece');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setDescription(productToEdit.description || '');
      setIsActive(productToEdit.isActive);
    } else {
      setName('');
      setCategory('Industrial Filter');
      setUnit('piece');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Product name is required.');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Product name must not exceed 100 characters.');
      return;
    }

    if (isEditing && hasBomItems && productToEdit && unit !== productToEdit.unit) {
      setError('Cannot modify unit because this product already has active BOM items.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await onSubmit({
          name: trimmedName,
          category,
          unit,
          description: description.trim(),
          isActive,
        });
      } else {
        await onSubmit({
          name: trimmedName,
          category,
          unit,
          description: description.trim(),
          isActive,
        });
      }
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save product:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 41, 66, 0.45)',
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
          maxWidth: '540px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
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
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F2942' }}>
              {isEditing ? 'Edit Product Master' : 'Create New Product'}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              {isEditing
                ? `Editing ${productToEdit?.productCode} — ${productToEdit?.name}`
                : 'Define finished goods product master metadata'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
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
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {isEditing && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '6px',
                }}
              >
                Product Code (Immutable)
              </label>
              <input
                type="text"
                value={productToEdit?.productCode}
                disabled
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#64748B',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="product-name"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F2942',
                marginBottom: '6px',
              }}
            >
              Product Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mini Filter A 200mm"
              required
              disabled={submitting}
              maxLength={100}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                color: '#0F2942',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <label
                htmlFor="product-category"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F2942',
                  marginBottom: '6px',
                }}
              >
                Category <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  color: '#0F2942',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="product-unit"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F2942',
                  marginBottom: '6px',
                }}
              >
                Unit of Measure <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="product-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                disabled={submitting || (isEditing && hasBomItems)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  color: '#0F2942',
                  backgroundColor: isEditing && hasBomItems ? '#F8FAFC' : '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label} ({u.value})
                  </option>
                ))}
              </select>
              {isEditing && hasBomItems && (
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                  Unit locked while BOM items are active
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="product-description"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0F2942',
                marginBottom: '6px',
              }}
            >
              Description / Notes
            </label>
            <textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Standard cartridge filter for hydraulic systems"
              rows={3}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                color: '#0F2942',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#0F2942',
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
                style={{ width: '16px', height: '16px', accentColor: '#087EA4' }}
              />
              Active Product Master
            </label>
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '16px',
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
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
