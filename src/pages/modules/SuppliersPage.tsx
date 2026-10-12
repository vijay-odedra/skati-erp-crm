import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Plus,
  Search,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Edit,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Supplier } from '../../services/purchases/purchaseTypes.ts';
import { getSuppliers } from '../../services/purchases/suppliers.ts';
import { SupplierFormModal } from '../../components/purchases/SupplierFormModal.tsx';
import { SupplierDetailModal } from '../../components/purchases/SupplierDetailModal.tsx';
import { useAuth } from '../../hooks/useAuth.ts';

interface SuppliersPageProps {
  onSelectSupplierForPurchase?: (supplierId: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = () => {
  const { hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const canCreate = hasPermission('suppliers.create');
  const canUpdate = hasPermission('suppliers.update');

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);

  const fetchSuppliersList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);

        const res = await getSuppliers(
          {
            activeStatus: activeFilter,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );

        setSuppliers(res.items);
        setHasMore(res.hasMore);

        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load suppliers:', err);
        setError(err instanceof Error ? err.message : 'An error occurred loading suppliers.');
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, searchQuery, page]
  );

  useEffect(() => {
    const currentCursor = pageCursors[page - 1] || null;
    void fetchSuppliersList(currentCursor);
  }, [fetchSuppliersList, page, pageCursors]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    setPageCursors([null]);
  };

  const handleFilterChange = (filter: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    setActiveFilter(filter);
    setPage(1);
    setPageCursors([null]);
  };

  const handleNextPage = () => {
    if (hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F2942',
              letterSpacing: '-0.3px',
            }}
          >
            Supplier Master Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Manage raw material vendors, contact credentials, GSTIN registration, and business details
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => void fetchSuppliersList(pageCursors[page - 1] || null)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              backgroundColor: '#FFFFFF',
              color: '#0F2942',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setIsFormModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#087EA4',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <Plus size={18} />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#991B1B',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '360px' }}>
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => startTransition(() => handleSearchChange(e.target.value))}
              placeholder="Search by name, code, contact person, or GSTIN..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F2942',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={activeFilter}
            onChange={(e) => handleFilterChange(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F2942',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">All Suppliers (Active &amp; Inactive)</option>
            <option value="ACTIVE">Active Suppliers Only</option>
            <option value="INACTIVE">Inactive Suppliers Only</option>
          </select>
        </div>

        {/* Reset Filters */}
        {(activeFilter !== 'ALL' || searchQuery !== '') && (
          <button
            type="button"
            onClick={() => {
              setActiveFilter('ALL');
              setSearchQuery('');
              setPage(1);
              setPageCursors([null]);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Suppliers Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Supplier Code
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Supplier Name &amp; GSTIN
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Contact Person &amp; Phone
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Location
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    Loading supplier directory...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#64748B' }}>
                      <Building2 size={36} color="#94A3B8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                        No suppliers found
                      </span>
                      <span style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                        Register raw material suppliers to enable purchase orders and inward tracking.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: '#087EA4' }}>
                      {s.supplierCode}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                        {s.name}
                      </div>
                      {s.gstNumber ? (
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <FileText size={12} />
                          <span>GSTIN: {s.gstNumber}</span>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontSize: '13px', color: '#0F2942', fontWeight: 500 }}>
                        {s.contactPerson || '—'}
                      </div>
                      {s.phone ? (
                        <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Phone size={12} />
                          <span>{s.phone}</span>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#94A3B8" />
                        <span>{[s.city, s.state].filter(Boolean).join(', ') || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: s.isActive ? '#DCFCE7' : '#F1F5F9',
                          color: s.isActive ? '#15803D' : '#64748B',
                          border: `1px solid ${s.isActive ? '#BBF7D0' : '#E2E8F0'}`,
                        }}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setViewingSupplierId(s.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSupplier(s);
                              setIsFormModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <Edit size={14} />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FAFCFD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Showing Page <strong style={{ color: '#0F2942' }}>{page}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page <= 1 || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: page <= 1 ? '#94A3B8' : '#0F2942',
                fontSize: '13px',
                fontWeight: 500,
                cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={!hasMore || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: !hasMore ? '#94A3B8' : '#0F2942',
                fontSize: '13px',
                fontWeight: 500,
                cursor: !hasMore || loading ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Create/Edit Modal */}
      {isFormModalOpen && (
        <SupplierFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingSupplier(null);
          }}
          initialSupplier={editingSupplier}
          onSuccess={() => void fetchSuppliersList(pageCursors[page - 1] || null)}
        />
      )}

      {/* Supplier Detail Modal */}
      {viewingSupplierId && (
        <SupplierDetailModal
          isOpen={Boolean(viewingSupplierId)}
          onClose={() => setViewingSupplierId(null)}
          supplierId={viewingSupplierId}
          onEditSupplier={(sup) => {
            setEditingSupplier(sup);
            setIsFormModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
