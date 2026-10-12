import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Package,
  Layers,
  Search,
} from 'lucide-react';
import type { Product, BomItem } from '../../services/products/productTypes.ts';
import type { RawMaterial } from '../../services/inventory/inventoryTypes.ts';
import {
  getBomItems,
  addBomItem,
  updateBomItemQuantity,
  deactivateBomItem,
} from '../../services/products/bom.ts';
import { getRawMaterials } from '../../services/inventory/rawMaterials.ts';
import { getUnitLabel } from '../../constants/inventory.ts';
import { getProductUnitLabel } from '../../constants/products.ts';
import { useAuth } from '../../hooks/useAuth.ts';

interface BomManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onBomUpdated?: () => void;
}

export const BomManagementModal: React.FC<BomManagementModalProps> = ({
  isOpen,
  onClose,
  product,
  onBomUpdated,
}) => {
  const { user, hasPermission } = useAuth();
  const canEditBom = hasPermission('bom.update') || hasPermission('bom.create');
  const canDeleteBom = hasPermission('bom.delete');

  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Item State
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  const [searchMaterialText, setSearchMaterialText] = useState('');
  const [searchingMaterials, setSearchingMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // Edit Inline State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load existing active BOM items
  const fetchBom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getBomItems(product.id);
      setBomItems(items);
    } catch (err: unknown) {
      console.error('Failed to load BOM items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load BOM items.');
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    if (isOpen) {
      void fetchBom();
    }
  }, [isOpen, fetchBom]);

  // Search materials asynchronously with pagination & limit
  const handleSearchMaterials = useCallback(async (text: string) => {
    try {
      setSearchingMaterials(true);
      const res = await getRawMaterials({
        activeStatus: 'ACTIVE',
        searchQuery: text,
        pageSize: 15,
      });
      setAvailableMaterials(res.items);
    } catch (err: unknown) {
      console.error('Failed to search raw materials:', err);
    } finally {
      setSearchingMaterials(false);
    }
  }, []);

  // Initial load of raw materials when modal opens
  useEffect(() => {
    if (isOpen) {
      void handleSearchMaterials('');
    }
  }, [isOpen, handleSearchMaterials]);

  if (!isOpen) return null;

  const handleAddMaterialToBom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedMaterial) {
      setError('Please select a raw material.');
      return;
    }

    const qty = Number(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity per product must be a positive number greater than zero.');
      return;
    }

    if (selectedMaterial.unit === 'piece' && !Number.isInteger(qty)) {
      setError('Raw material with unit "Piece" requires a whole integer quantity.');
      return;
    }

    // Client check for duplicates
    const alreadyInBom = bomItems.some((b) => b.rawMaterialId === selectedMaterial.id);
    if (alreadyInBom) {
      setError(
        `Material "${selectedMaterial.name}" is already in this BOM. Edit the quantity below instead.`
      );
      return;
    }

    try {
      setAddingItem(true);
      await addBomItem(
        product.id,
        {
          rawMaterialId: selectedMaterial.id,
          quantityPerProduct: qty,
        },
        user?.uid || 'system'
      );

      // Reset form
      setSelectedMaterial(null);
      setQuantityInput('');
      setSearchMaterialText('');
      await fetchBom();
      if (onBomUpdated) onBomUpdated();
    } catch (err: unknown) {
      console.error('Failed to add BOM item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add BOM item.');
    } finally {
      setAddingItem(false);
    }
  };

  const handleStartEdit = (item: BomItem) => {
    setEditingItemId(item.id);
    setEditQuantityValue(String(item.quantityPerProduct));
    setError(null);
  };

  const handleSaveEdit = async (item: BomItem) => {
    const qty = Number(editQuantityValue);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (item.unitSnapshot === 'piece' && !Number.isInteger(qty)) {
      setError('Unit "Piece" requires a whole integer number.');
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);
      await updateBomItemQuantity(item.id, qty, user?.uid || 'system');
      setEditingItemId(null);
      await fetchBom();
      if (onBomUpdated) onBomUpdated();
    } catch (err: unknown) {
      console.error('Failed to update BOM item quantity:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quantity.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeactivate = async (item: BomItem) => {
    if (!window.confirm(`Remove "${item.materialNameSnapshot}" from this BOM?`)) {
      return;
    }

    try {
      setError(null);
      await deactivateBomItem(item.id, user?.uid || 'system');
      await fetchBom();
      if (onBomUpdated) onBomUpdated();
    } catch (err: unknown) {
      console.error('Failed to deactivate BOM item:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove BOM item.');
    }
  };

  const isPieceUnit = selectedMaterial?.unit === 'piece';

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
          maxWidth: '820px',
          maxHeight: '90vh',
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
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F2942' }}>
                  Bill of Materials (BOM)
                </h3>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: bomItems.length > 0 ? '#DCFCE7' : '#F1F5F9',
                    color: bomItems.length > 0 ? '#16A34A' : '#64748B',
                    border: `1px solid ${bomItems.length > 0 ? '#BBF7D0' : '#E2E8F0'}`,
                  }}
                >
                  {bomItems.length > 0 ? 'Complete' : 'No BOM'}
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Define raw material consumption required to produce 1{' '}
                {getProductUnitLabel(product.unit)} of {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Product Summary Bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '13px',
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>Product Code: </span>
            <strong style={{ color: '#0F2942' }}>{product.productCode}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Product Name: </span>
            <strong style={{ color: '#0F2942' }}>{product.name}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Category: </span>
            <strong style={{ color: '#0F2942' }}>{product.category}</strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Finished Unit: </span>
            <strong style={{ color: '#087EA4' }}>{getProductUnitLabel(product.unit)}</strong>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
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

          {/* Add BOM Material Section */}
          {canEditBom && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0369A1',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} />
                <span>Add Material Component</span>
              </div>

              <form onSubmit={handleAddMaterialToBom}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr auto',
                    gap: '12px',
                    alignItems: 'end',
                  }}
                >
                  {/* Material Search / Select */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0F2942',
                        marginBottom: '4px',
                      }}
                    >
                      Select Raw Material <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedMaterial?.id || ''}
                        onChange={(e) => {
                          const mat = availableMaterials.find((m) => m.id === e.target.value);
                          setSelectedMaterial(mat || null);
                          setError(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '13px',
                          color: '#0F2942',
                          boxSizing: 'border-box',
                        }}
                      >
                        <option value="">-- Choose active raw material --</option>
                        {availableMaterials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.materialCode} — {m.name} ({getUnitLabel(m.unit)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Material Unit (Auto-fixed snapshot) */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748B',
                        marginBottom: '4px',
                      }}
                    >
                      Material Unit
                    </label>
                    <input
                      type="text"
                      disabled
                      value={
                        selectedMaterial
                          ? `${getUnitLabel(selectedMaterial.unit)} (${selectedMaterial.unit})`
                          : '—'
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        color: '#64748B',
                        fontSize: '13px',
                        fontWeight: 500,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Quantity Per Product */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0F2942',
                        marginBottom: '4px',
                      }}
                    >
                      Qty per 1 {product.unit} <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      placeholder={isPieceUnit ? 'e.g. 2' : 'e.g. 1.5'}
                      step={isPieceUnit ? '1' : '0.001'}
                      min="0.0001"
                      required
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

                  {/* Add Button */}
                  <div>
                    <button
                      type="submit"
                      disabled={addingItem || !selectedMaterial || !quantityInput}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#087EA4',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor:
                          addingItem || !selectedMaterial || !quantityInput
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: addingItem || !selectedMaterial || !quantityInput ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {addingItem ? 'Adding...' : 'Add to BOM'}
                    </button>
                  </div>
                </div>

                {/* Search helper row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#64748B',
                  }}
                >
                  <Search size={14} color="#94A3B8" />
                  <span>Filter material list:</span>
                  <input
                    type="text"
                    value={searchMaterialText}
                    onChange={(e) => {
                      setSearchMaterialText(e.target.value);
                      void handleSearchMaterials(e.target.value);
                    }}
                    placeholder="Search by code or name..."
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                      width: '200px',
                    }}
                  />
                  {searchingMaterials && (
                    <span style={{ fontSize: '11px', color: '#087EA4' }}>Searching...</span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* BOM Items Table */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                    }}
                  >
                    Material Code
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                    }}
                  >
                    Material Name
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                    }}
                  >
                    Unit
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                    }}
                  >
                    Qty per 1 {product.unit}
                  </th>
                  <th
                    style={{
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                      textAlign: 'right',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '32px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '13px',
                      }}
                    >
                      Loading BOM components...
                    </td>
                  </tr>
                ) : bomItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#64748B',
                        }}
                      >
                        <Package size={28} color="#94A3B8" />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                          No BOM components configured yet.
                        </span>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                          Add raw materials above to establish this product&apos;s bill of materials.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bomItems.map((item) => {
                    const isEditingThis = editingItemId === item.id;
                    const isPiece = item.unitSnapshot === 'piece';

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#087EA4',
                          }}
                        >
                          {item.materialCodeSnapshot}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#0F2942',
                          }}
                        >
                          {item.materialNameSnapshot}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748B' }}>
                          {getUnitLabel(item.unitSnapshot)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                          {isEditingThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                value={editQuantityValue}
                                onChange={(e) => setEditQuantityValue(e.target.value)}
                                step={isPiece ? '1' : '0.001'}
                                min="0.0001"
                                disabled={savingEdit}
                                style={{
                                  width: '90px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #087EA4',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(item)}
                                disabled={savingEdit}
                                title="Save quantity"
                                style={{
                                  padding: '4px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#DCFCE7',
                                  color: '#16A34A',
                                  cursor: 'pointer',
                                }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                disabled={savingEdit}
                                title="Cancel"
                                style={{
                                  padding: '4px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#F1F5F9',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <strong style={{ color: '#0F2942' }}>
                              {item.quantityPerProduct}{' '}
                              <span style={{ fontWeight: 400, color: '#64748B' }}>
                                {item.unitSnapshot}
                              </span>
                            </strong>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '8px',
                            }}
                          >
                            {!isEditingThis && canEditBom && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                title="Edit quantity"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #E2E8F0',
                                  backgroundColor: '#FFFFFF',
                                  color: '#475569',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                <Edit2 size={14} />
                                <span>Edit</span>
                              </button>
                            )}
                            {canDeleteBom && (
                              <button
                                type="button"
                                onClick={() => void handleDeactivate(item)}
                                title="Remove component"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #FEE2E2',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px',
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
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
            Total Components:{' '}
            <strong style={{ color: '#0F2942' }}>{bomItems.length}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F2942',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
