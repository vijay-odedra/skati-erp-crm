import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  MinusCircle,
  Edit2,
  Power,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import type {
  RawMaterial,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  RecordUsageInput,
  RecordAdjustmentInput,
  MaterialCategory,
  MaterialUnit,
  StockStatus,
} from '../../services/inventory/inventoryTypes.ts';
import {
  getRawMaterials,
  createRawMaterial,
  updateRawMaterial,
} from '../../services/inventory/rawMaterials.ts';
import {
  recordStockUsage,
  recordStockAdjustment,
} from '../../services/inventory/stockTransactions.ts';
import {
  calculateStockStatus,
  STOCK_STATUS_CONFIG,
  getUnitLabel,
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
} from '../../constants/inventory.ts';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.tsx';
import { MaterialFormModal } from '../../components/inventory/MaterialFormModal.tsx';
import { StockUsageModal } from '../../components/inventory/StockUsageModal.tsx';
import { StockAdjustmentModal } from '../../components/inventory/StockAdjustmentModal.tsx';
import { StockHistoryModal } from '../../components/inventory/StockHistoryModal.tsx';

export const RawMaterialsPage: React.FC = () => {
  const { profile, hasPermission } = useAuth();

  // State
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'ALL'>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<MaterialUnit | 'ALL'>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockStatus | 'ALL'>('ALL');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');

  // Pagination state with DocumentSnapshot cursor stack
  const [page, setPage] = useState<number>(1);
  const [pageCursors, setPageCursors] = useState<(unknown)[]>([null]);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastDocSnap, setLastDocSnap] = useState<unknown>(null);
  const pageSize = 20;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [usageMaterial, setUsageMaterial] = useState<RawMaterial | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);

  const [adjustmentMaterial, setAdjustmentMaterial] = useState<RawMaterial | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  const [historyMaterial, setHistoryMaterial] = useState<RawMaterial | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Permission flags
  const canCreate = hasPermission('raw_materials.create');
  const canUpdate = hasPermission('raw_materials.update');
  const canAdjust = profile?.role === 'admin' || profile?.role === 'manager';

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const fetchMaterials = useCallback(
    async (cursor?: unknown) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getRawMaterials(
          {
            category: selectedCategory,
            unit: selectedUnit,
            stockStatus: selectedStockStatus,
            activeStatus: selectedActiveStatus,
            searchQuery,
            pageSize,
          },
          cursor as any
        );
        setMaterials(result.items);
        setHasMore(result.hasMore);
        setLastDocSnap(result.lastDoc);
      } catch (err: unknown) {
        const errorObj = err as { message?: string };
        setError(errorObj.message || 'Failed to fetch raw materials.');
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, selectedUnit, selectedStockStatus, selectedActiveStatus, searchQuery, pageSize]
  );

  useEffect(() => {
    setPage(1);
    setPageCursors([null]);
    void fetchMaterials(null);
  }, [fetchMaterials]);

  const handleNextPage = () => {
    if (!hasMore || !lastDocSnap) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setPageCursors((prev) => {
      const nextCursors = [...prev];
      nextCursors[nextPage - 1] = lastDocSnap;
      return nextCursors;
    });
    void fetchMaterials(lastDocSnap);
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    const prevPage = page - 1;
    const prevCursor = pageCursors[prevPage - 1] || null;
    setPage(prevPage);
    void fetchMaterials(prevCursor);
  };

  // Handle Material Creation / Edit
  const handleSaveMaterial = async (
    data: CreateRawMaterialInput | UpdateRawMaterialInput
  ) => {
    const userIdentifier = profile?.displayName || profile?.email || profile?.uid || 'User';

    if (editingMaterial) {
      await updateRawMaterial(
        editingMaterial.id,
        data as UpdateRawMaterialInput,
        userIdentifier
      );
      showToast(`Raw material ${editingMaterial.materialCode} updated successfully.`);
    } else {
      const newMaterial = await createRawMaterial(
        data as CreateRawMaterialInput,
        userIdentifier
      );
      showToast(`Raw material ${newMaterial.materialCode} created successfully.`);
    }
    await fetchMaterials();
  };

  // Handle Stock Usage
  const handleStockUsage = async (input: RecordUsageInput) => {
    const userIdentifier = profile?.displayName || profile?.email || profile?.uid || 'User';
    await recordStockUsage(input, userIdentifier);
    showToast(`Stock usage recorded successfully.`);
    await fetchMaterials();
  };

  // Handle Stock Adjustment
  const handleStockAdjustment = async (input: RecordAdjustmentInput) => {
    const userIdentifier = profile?.displayName || profile?.email || profile?.uid || 'User';
    await recordStockAdjustment(input, userIdentifier);
    showToast(`Stock adjustment applied successfully.`);
    await fetchMaterials();
  };

  // Handle Activate / Deactivate Toggle
  const handleToggleActive = async (material: RawMaterial) => {
    if (!canUpdate) return;
    const userIdentifier = profile?.displayName || profile?.email || profile?.uid || 'User';
    try {
      await updateRawMaterial(
        material.id,
        { isActive: !material.isActive },
        userIdentifier
      );
      showToast(
        `Material ${material.materialCode} is now ${!material.isActive ? 'Active' : 'Deactivated'}.`
      );
      await fetchMaterials();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || 'Failed to update status.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F2942',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            fontSize: '13px',
            fontWeight: 500,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#10B981', fontWeight: 700 }}>✔</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#087EA4',
              }}
            >
              <Boxes size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F2942', margin: 0 }}>
                Raw Materials & Inventory
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                Manage material specifications, real-time stock balances, and audit trails
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingMaterial(null);
                setIsFormModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              <Plus size={16} />
              <span>Add Raw Material</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '11px', color: '#94A3B8' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search code (RM-0001) or name..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                outline: 'none',
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as MaterialCategory | 'ALL');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Categories</option>
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div style={{ flex: '0 1 140px' }}>
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value as MaterialUnit | 'ALL');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Units</option>
              {MATERIAL_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div style={{ flex: '0 1 150px' }}>
            <select
              value={selectedStockStatus}
              onChange={(e) => {
                setSelectedStockStatus(e.target.value as StockStatus | 'ALL');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="NORMAL">Normal Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Active Status Filter */}
          <div style={{ flex: '0 1 130px' }}>
            <select
              value={selectedActiveStatus}
              onChange={(e) => {
                setSelectedActiveStatus(e.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL');
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #D9EAF0',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="ALL">All Status</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedUnit('ALL');
              setSelectedStockStatus('ALL');
              setSelectedActiveStatus('ACTIVE');
              setPage(1);
            }}
            title="Reset Filters"
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          boxShadow: '0 2px 6px rgba(15, 41, 66, 0.03)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 0' }}>
            <LoadingSpinner message="Loading raw materials inventory..." />
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 600 }}>{error}</p>
          </div>
        ) : materials.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
              }}
            >
              <Boxes size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F2942', margin: 0 }}>
              No raw materials found
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: 0 }}>
              {searchQuery || selectedCategory !== 'ALL' || selectedStockStatus !== 'ALL'
                ? 'Try adjusting your search query or filters to find items.'
                : 'Get started by creating your first raw material master record.'}
            </p>
            {canCreate && !searchQuery && selectedCategory === 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setEditingMaterial(null);
                  setIsFormModalOpen(true);
                }}
                style={{
                  marginTop: '8px',
                  padding: '8px 18px',
                  backgroundColor: '#087EA4',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={16} />
                <span>Add Raw Material</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #D9EAF0',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                    }}
                  >
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '110px' }}>Code</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Material Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '80px' }}>Unit</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', width: '120px' }}>
                      Current Stock
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', width: '110px' }}>
                      Min. Stock
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px', textAlign: 'center' }}>
                      Stock Status
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '90px', textAlign: 'center' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right', width: '220px' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((mat) => {
                    const status = calculateStockStatus(mat.currentStock, mat.minimumStock);
                    const statusStyle = STOCK_STATUS_CONFIG[status];
                    const unitStr = getUnitLabel(mat.unit);

                    return (
                      <tr
                        key={mat.id}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.1s',
                          opacity: mat.isActive ? 1 : 0.65,
                        }}
                      >
                        {/* Material Code */}
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#075985' }}>
                          {mat.materialCode}
                        </td>

                        {/* Name & Description */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#0F2942' }}>{mat.name}</div>
                          {mat.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#64748B',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '280px',
                              }}
                            >
                              {mat.description}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          <span
                            style={{
                              backgroundColor: '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {mat.category}
                          </span>
                        </td>

                        {/* Unit */}
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{unitStr}</td>

                        {/* Current Stock */}
                        <td
                          style={{
                            padding: '12px 16px',
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: mat.currentStock <= mat.minimumStock ? '#DC2626' : '#0F2942',
                          }}
                        >
                          {mat.currentStock.toLocaleString('en-IN')}
                        </td>

                        {/* Minimum Stock */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>
                          {mat.minimumStock.toLocaleString('en-IN')}
                        </td>

                        {/* Stock Status Badge */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: statusStyle.bgColor,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.borderColor}`,
                            }}
                          >
                            {statusStyle.label}
                          </span>
                        </td>

                        {/* Active Toggle */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              backgroundColor: mat.isActive ? '#DCFCE7' : '#F1F5F9',
                              color: mat.isActive ? '#15803D' : '#64748B',
                            }}
                          >
                            {mat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {/* Record Usage (Deduct) */}
                            <button
                              type="button"
                              onClick={() => {
                                setUsageMaterial(mat);
                                setIsUsageModalOpen(true);
                              }}
                              disabled={!mat.isActive || mat.currentStock <= 0}
                              title="Record Stock Usage"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #D9EAF0',
                                backgroundColor: '#FFFFFF',
                                color: mat.isActive && mat.currentStock > 0 ? '#DC2626' : '#CBD5E1',
                                cursor: mat.isActive && mat.currentStock > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              <MinusCircle size={13} />
                              <span>Use</span>
                            </button>

                            {/* Stock Adjustment (Admin / Manager) */}
                            {canAdjust && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustmentMaterial(mat);
                                  setIsAdjustmentModalOpen(true);
                                }}
                                disabled={!mat.isActive}
                                title="Adjust Stock (Admin/Manager)"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #D9EAF0',
                                  backgroundColor: '#FFFFFF',
                                  color: mat.isActive ? '#075985' : '#CBD5E1',
                                  cursor: mat.isActive ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Adjust</span>
                              </button>
                            )}

                            {/* Audit History */}
                            <button
                              type="button"
                              onClick={() => {
                                setHistoryMaterial(mat);
                                setIsHistoryModalOpen(true);
                              }}
                              title="View Audit Trail"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #D9EAF0',
                                backgroundColor: '#FFFFFF',
                                color: '#64748B',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                              }}
                            >
                              <History size={13} />
                            </button>

                            {/* Edit Master (Admin / Purchase) */}
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMaterial(mat);
                                  setIsFormModalOpen(true);
                                }}
                                title="Edit Master Specifications"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #D9EAF0',
                                  backgroundColor: '#FFFFFF',
                                  color: '#087EA4',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                }}
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {/* Active/Inactive Toggle (Admin/Manager) */}
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(mat)}
                                title={mat.isActive ? 'Deactivate Material' : 'Activate Material'}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #D9EAF0',
                                  backgroundColor: '#FFFFFF',
                                  color: mat.isActive ? '#94A3B8' : '#16A34A',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Power size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #D9EAF0',
                backgroundColor: '#FAFCFD',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              <div>
                Page <strong>{page}</strong> &bull; Showing <strong>{materials.length}</strong> items (Page size: {pageSize})
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid #D9EAF0',
                    backgroundColor: '#FFFFFF',
                    color: page <= 1 ? '#CBD5E1' : '#0F2942',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!hasMore}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid #D9EAF0',
                    backgroundColor: '#FFFFFF',
                    color: !hasMore ? '#CBD5E1' : '#0F2942',
                    cursor: !hasMore ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <MaterialFormModal
        isOpen={isFormModalOpen}
        materialToEdit={editingMaterial}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSaveMaterial}
      />

      <StockUsageModal
        isOpen={isUsageModalOpen}
        material={usageMaterial}
        onClose={() => setIsUsageModalOpen(false)}
        onSubmit={handleStockUsage}
      />

      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        material={adjustmentMaterial}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSubmit={handleStockAdjustment}
      />

      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        material={historyMaterial}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
