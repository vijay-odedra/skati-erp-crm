import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type {
  RawMaterial,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  MaterialUnit,
  MaterialCategory,
} from '../../services/inventory/inventoryTypes.ts';
import {
  MATERIAL_UNITS,
  MATERIAL_CATEGORIES,
} from '../../constants/inventory.ts';

interface MaterialFormModalProps {
  materialToEdit?: RawMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: CreateRawMaterialInput | UpdateRawMaterialInput
  ) => Promise<void>;
}

const MaterialFormContent: React.FC<{
  materialToEdit?: RawMaterial | null;
  onClose: () => void;
  onSubmit: (
    data: CreateRawMaterialInput | UpdateRawMaterialInput
  ) => Promise<void>;
}> = ({ materialToEdit, onClose, onSubmit }) => {
  const isEditMode = Boolean(materialToEdit);

  const [name, setName] = useState(materialToEdit?.name || '');
  const [category, setCategory] = useState<MaterialCategory>(
    materialToEdit?.category || 'Filter Media'
  );
  const [unit, setUnit] = useState<MaterialUnit>(
    materialToEdit?.unit || 'kg'
  );
  const [minimumStock, setMinimumStock] = useState<string>(
    materialToEdit ? String(materialToEdit.minimumStock) : '100'
  );
  const [initialStock, setInitialStock] = useState<string>('0');
  const [description, setDescription] = useState(
    materialToEdit?.description || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Material name is required.');
      return;
    }

    const minStockNum = Number(minimumStock);
    if (isNaN(minStockNum) || minStockNum < 0) {
      setError('Minimum stock must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        await onSubmit({
          name: trimmedName,
          category,
          description: description.trim(),
          minimumStock: minStockNum,
        } as UpdateRawMaterialInput);
      } else {
        const initStockNum = Number(initialStock);
        if (isNaN(initStockNum) || initStockNum < 0) {
          setError('Initial stock must be a non-negative number.');
          setIsSubmitting(false);
          return;
        }

        await onSubmit({
          name: trimmedName,
          category,
          unit,
          description: description.trim(),
          minimumStock: minStockNum,
          initialStock: initStockNum,
        } as CreateRawMaterialInput);
      }
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to save material.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #D9EAF0',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 8px 24px rgba(15, 41, 66, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #D9EAF0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', margin: 0 }}>
            {isEditMode ? 'Edit Raw Material' : 'Add New Raw Material'}
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            {isEditMode
              ? `Update master specifications for ${materialToEdit?.materialCode}`
              : 'Register a raw material item into the inventory master'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '6px',
              color: '#DC2626',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Material Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Material Name <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. PP Non-Woven Filter Fabric 50 GSM"
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Category & Unit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
              Category <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MaterialCategory)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
              Unit of Measure <span style={{ color: '#DC2626' }}>*</span>
            </label>
            {isEditMode ? (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  fontSize: '14px',
                  color: '#64748B',
                  fontWeight: 500,
                }}
                title="Unit cannot be altered after creation to preserve transaction consistency"
              >
                {MATERIAL_UNITS.find((u) => u.value === unit)?.label || unit} (Locked)
              </div>
            ) : (
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D9EAF0',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                {MATERIAL_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Stock Parameters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
              Minimum Stock Level <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              placeholder="100"
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Triggers Low Stock warning
            </span>
          </div>

          {!isEditMode && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
                Initial Stock Inward
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D9EAF0',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Recorded as INITIAL transaction
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Description / Technical Specs
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Dimensions, supplier grade, filtration rating, storage notes..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #D9EAF0',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSubmitting ? '#64748B' : '#087EA4',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting
              ? 'Saving...'
              : isEditMode
              ? 'Update Material'
              : 'Save Raw Material'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  materialToEdit,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 41, 66, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <MaterialFormContent
        key={materialToEdit?.id || 'new'}
        materialToEdit={materialToEdit}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
};
