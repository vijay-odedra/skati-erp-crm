import React, { useState, useEffect } from 'react';
import { X, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { Customer, CustomerRequirement, CreateRequirementInput, UpdateRequirementInput, CrmPriority, RequirementStatus } from '../../services/crm/crmTypes.ts';
import type { Product } from '../../services/products/productTypes.ts';
import { createRequirement, updateRequirement } from '../../services/crm/requirements.ts';
import { getCustomers } from '../../services/crm/customers.ts';
import { getProducts } from '../../services/products/products.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requirementId: string) => void;
  initialRequirement?: CustomerRequirement | null;
  defaultCustomer?: Customer | null;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRequirement,
  defaultCustomer,
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(initialRequirement);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialRequirement?.customerId || defaultCustomer?.id || ''
  );
  const [title, setTitle] = useState(initialRequirement?.title || '');
  const [description, setDescription] = useState(initialRequirement?.description || '');
  const [selectedProductId, setSelectedProductId] = useState(initialRequirement?.productId || '');
  const [quantity, setQuantity] = useState(initialRequirement?.quantity ? String(initialRequirement.quantity) : '');
  const [unit, setUnit] = useState(initialRequirement?.unit || 'piece');
  const [expectedDate, setExpectedDate] = useState(() => {
    if (initialRequirement?.expectedDate?.toDate) {
      return initialRequirement.expectedDate.toDate().toISOString().split('T')[0];
    }
    return '';
  });
  const [priority, setPriority] = useState<CrmPriority>(initialRequirement?.priority || 'MEDIUM');
  const [status, setStatus] = useState<RequirementStatus>(initialRequirement?.status || 'OPEN');
  const [notes, setNotes] = useState(initialRequirement?.notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        setLoadingLookups(true);
        const [cRes, pRes] = await Promise.all([
          getCustomers({ activeStatus: 'ACTIVE', pageSize: 100 }),
          getProducts({ activeStatus: 'ACTIVE', pageSize: 100 }),
        ]);
        setCustomers(cRes.items);
        setProducts(pRes.items);
      } catch (err: unknown) {
        console.error('Error loading lookups:', err);
      } finally {
        setLoadingLookups(false);
      }
    };
    void loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Requirement title is required.');
      return;
    }

    if (!user) {
      setError('You must be authenticated.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && initialRequirement) {
        const updatePayload: UpdateRequirementInput = {
          title: trimmedTitle,
          description: description.trim(),
          productId: selectedProductId || undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          unit,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          priority,
          status,
          notes: notes.trim() || undefined,
        };
        await updateRequirement(initialRequirement.id, updatePayload, user.uid);
        onSuccess(initialRequirement.id);
      } else {
        const createPayload: CreateRequirementInput = {
          customerId: selectedCustomerId,
          title: trimmedTitle,
          description: description.trim(),
          productId: selectedProductId || undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          unit,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          priority,
          status,
          assignedTo: user.email || 'Sales Team',
          notes: notes.trim() || undefined,
        };
        const created = await createRequirement(createPayload, user.uid);
        onSuccess(created.id);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error saving requirement:', err);
      setError(err instanceof Error ? err.message : 'Failed to save requirement.');
    } finally {
      setLoading(false);
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
          maxWidth: '680px',
          maxHeight: '90vh',
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
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                {isEditing ? `Edit Requirement: ${initialRequirement?.requirementCode}` : 'Log Customer Requirement'}
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Record client inquiries, specifications, target product, and expected quantities
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
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            {/* Customer select */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Customer <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                required
                disabled={isEditing || Boolean(defaultCustomer) || loadingLookups}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  backgroundColor: isEditing || Boolean(defaultCustomer) ? '#F1F5F9' : '#FFFFFF',
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

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Inquiry Title <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10 Micron Pleated Filter Cartridges"
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

            {/* Product selection (optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Standard Product (Optional)
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) setUnit(prod.unit);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">-- Custom / Non-standard Item --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.productCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Target Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 500"
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
                  Unit
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="piece, set..."
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

            {/* Status, Priority, Expected Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RequirementStatus)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="OPEN">Open Inquiry</option>
                  <option value="IN_PROGRESS">In Review</option>
                  <option value="QUOTED">Quotation Sent</option>
                  <option value="WON">Confirmed / Won</option>
                  <option value="LOST">Lost</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as CrmPriority)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
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

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Technical Specifications / Requirements Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specific dimensions, operating pressure, temperature rating, media grade..."
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

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Internal Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for sales & engineering team..."
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
              disabled={loading}
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
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Requirement' : 'Save Requirement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
