import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type {
  RawMaterial,
  RecordAdjustmentInput,
} from '../../services/inventory/inventoryTypes.ts';
import { getUnitLabel } from '../../constants/inventory.ts';

interface StockAdjustmentModalProps {
  material: RawMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RecordAdjustmentInput) => Promise<void>;
}

const REASON_SUGGESTIONS = [
  'Physical stock count correction',
  'Damaged / degraded raw material',
  'Supplier shipment quantity discrepancy',
  'Scrap / sample testing usage',
  'Data entry correction',
];

const StockAdjustmentContent: React.FC<{
  material: RawMaterial;
  onClose: () => void;
  onSubmit: (data: RecordAdjustmentInput) => Promise<void>;
}> = ({ material, onClose, onSubmit }) => {
  const [type, setType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStock = material.currentStock;
  const unitLabel = getUnitLabel(material.unit);
  const parsedQty = Number(quantity) || 0;

  const projectedStock =
    type === 'ADJUSTMENT_IN'
      ? currentStock + parsedQty
      : Math.max(0, currentStock - parsedQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid adjustment quantity greater than zero.');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('A mandatory adjustment reason is required for audit traceability.');
      return;
    }

    if (type === 'ADJUSTMENT_OUT' && qtyNum > currentStock) {
      setError(
        `Insufficient stock for reduction. Current stock is ${currentStock} ${unitLabel}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        rawMaterialId: material.id,
        type,
        quantity: qtyNum,
        reason: trimmedReason,
      });
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Stock adjustment failed.');
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
        maxWidth: '520px',
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
            Adjust Stock Level
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Managerial adjustment with mandatory audit logging
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

        {/* Material Overview */}
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
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              {material.materialCode}
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F2942' }}>
              {material.name}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Current Stock</span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#087EA4' }}>
              {currentStock} {unitLabel}
            </div>
          </div>
        </div>

        {/* Adjustment Type Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '8px' }}>
            Adjustment Type <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setType('ADJUSTMENT_IN')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: `2px solid ${type === 'ADJUSTMENT_IN' ? '#16A34A' : '#D9EAF0'}`,
                backgroundColor: type === 'ADJUSTMENT_IN' ? '#DCFCE7' : '#FFFFFF',
                color: type === 'ADJUSTMENT_IN' ? '#15803D' : '#64748B',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Increase Stock (Inward)
            </button>
            <button
              type="button"
              onClick={() => setType('ADJUSTMENT_OUT')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: `2px solid ${type === 'ADJUSTMENT_OUT' ? '#DC2626' : '#D9EAF0'}`,
                backgroundColor: type === 'ADJUSTMENT_OUT' ? '#FEE2E2' : '#FFFFFF',
                color: type === 'ADJUSTMENT_OUT' ? '#B91C1C' : '#64748B',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              &minus; Reduce Stock (Outward)
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Quantity ({unitLabel}) <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="number"
            min="0.001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
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
          {parsedQty > 0 && (
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              New Stock Balance:{' '}
              <strong style={{ color: '#087EA4' }}>
                {projectedStock} {unitLabel}
              </strong>
            </div>
          )}
        </div>

        {/* Mandatory Reason */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#0F2942', marginBottom: '6px' }}>
            Adjustment Reason <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for adjustment"
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
          {/* Quick Suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {REASON_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setReason(sug)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {sug}
              </button>
            ))}
          </div>
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
            {isSubmitting ? 'Applying...' : 'Apply Stock Adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
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
      <StockAdjustmentContent
        key={material.id}
        material={material}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
};
