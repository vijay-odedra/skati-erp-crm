import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type {
  RawMaterial,
  RecordUsageInput,
} from '../../services/inventory/inventoryTypes.ts';
import { getUnitLabel } from '../../constants/inventory.ts';

interface StockUsageModalProps {
  material: RawMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecordUsageInput) => Promise<void>;
}

const StockUsageContent: React.FC<{
  material: RawMaterial;
  onClose: () => void;
  onSubmit: (data: RecordUsageInput) => Promise<void>;
}> = ({ material, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStock = material.currentStock;
  const unitLabel = getUnitLabel(material.unit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid usage quantity greater than zero.');
      return;
    }

    if (qtyNum > currentStock) {
      setError(
        `Insufficient stock available. Maximum available is ${currentStock} ${unitLabel}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rawMaterialId: material.id,
        quantity: qtyNum,
        referenceId: referenceId.trim(),
        reason: reason.trim() || 'Manual stock usage deduction',
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Stock usage deduction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedQty = Number(quantity) || 0;
  const projectedRemaining = Math.max(0, currentStock - parsedQty);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #D9EAF0',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 8px 24px rgba(15, 41, 66, 0.12)',
        display: 'flex',
        flexDirection: 'column',
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
            Record Stock Usage
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Deduct material stock for production or shop floor usage
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

      {/* Form Body */}
      <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Material Overview Badge */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, letterSpacing: '0.5px' }}>
              {material.materialCode}
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F2942' }}>
              {material.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Available Stock</span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#087EA4' }}>
              {currentStock} {unitLabel}
            </div>
          </div>
        </div>

        {/* Usage Quantity */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Quantity to Deduct ({unitLabel}) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="number"
            min="0.001"
            max={currentStock}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 25.5"
            required
            autoFocus
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {parsedQty > 0 && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Projected stock after deduction:{' '}
              <strong style={{ color: projectedRemaining <= material.minimumStock ? '#D97706' : '#16A34A' }}>
                {projectedRemaining} {unitLabel}
              </strong>
            </div>
          )}
        </div>

        {/* Job / Batch Reference */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Batch / Job Reference (Optional)
          </label>
          <input
            type="text"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder="e.g. PROD-BATCH-2026-001"
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

        {/* Usage Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Notes / Purpose
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Filter cartridge assembly line 2"
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
            disabled={isSubmitting || currentStock <= 0}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isSubmitting || currentStock <= 0 ? '#64748B' : '#DC2626',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isSubmitting || currentStock <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Recording...' : 'Confirm Stock Deduction'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const StockUsageModal: React.FC<StockUsageModalProps> = ({
  material,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen || !material) return null;

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
      <StockUsageContent
        key={material.id}
        material={material}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
};
