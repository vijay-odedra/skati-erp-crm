import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Plus,
  Search,
  ShoppingBag,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { Purchase, PurchaseStatus } from '../../services/purchases/purchaseTypes.ts';
import { getPurchases } from '../../services/purchases/purchases.ts';
import { getSuppliers } from '../../services/purchases/suppliers.ts';
import type { Supplier } from '../../services/purchases/purchaseTypes.ts';
import { PURCHASE_STATUS_CONFIG } from '../../constants/purchases.ts';
import { PurchaseEntryModal } from '../../components/purchases/PurchaseEntryModal.tsx';
import { PurchaseDetailModal } from '../../components/purchases/PurchaseDetailModal.tsx';
import { SuppliersPage } from './SuppliersPage.tsx';
import { useAuth } from '../../hooks/useAuth.ts';

type ActiveTab = 'purchases' | 'suppliers';

export const PurchasesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<ActiveTab>('purchases');
  const canCreatePurchase = hasPermission('purchases.create');

  // Purchase List State
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Suppliers lookup for filter dropdown
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<PurchaseStatus | 'ALL'>('ALL');

  // Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [viewingPurchaseId, setViewingPurchaseId] = useState<string | null>(null);

  // Fetch supplier lookup options
  useEffect(() => {
    getSuppliers({ activeStatus: 'ACTIVE', pageSize: 100 })
      .then((res) => setSuppliers(res.items))
      .catch((err: unknown) => console.error('Failed to load supplier options:', err));
  }, []);

  const fetchPurchasesList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);

        const res = await getPurchases(
          {
            supplierId: selectedSupplierId === 'ALL' ? undefined : selectedSupplierId,
            status: selectedStatus === 'ALL' ? undefined : selectedStatus,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );

        setPurchases(res.items);
        setHasMore(res.hasMore);

        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load purchase records:', err);
        setError(err instanceof Error ? err.message : 'An error occurred loading purchases.');
      } finally {
        setLoading(false);
      }
    },
    [selectedSupplierId, selectedStatus, searchQuery, page]
  );

  useEffect(() => {
    if (activeTab === 'purchases') {
      const currentCursor = pageCursors[page - 1] || null;
      void fetchPurchasesList(currentCursor);
    }
  }, [fetchPurchasesList, page, pageCursors, activeTab]);

  const handleSupplierFilter = (supId: string) => {
    setSelectedSupplierId(supId);
    setPage(1);
    setPageCursors([null]);
  };

  const handleStatusFilter = (status: PurchaseStatus | 'ALL') => {
    setSelectedStatus(status);
    setPage(1);
    setPageCursors([null]);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'purchases' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'purchases' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'purchases' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'purchases' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          <ShoppingBag size={18} />
          <span>Purchase Inward Orders</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'suppliers' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'suppliers' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'suppliers' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'suppliers' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
          }}
        >
          <Building2 size={18} />
          <span>Supplier Master Directory</span>
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <SuppliersPage />
      ) : (
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
                Purchase &amp; Goods Inward Management
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Multi-material goods receipts, atomic raw material stock increments, and invoice ledger
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => void fetchPurchasesList(pageCursors[page - 1] || null)}
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

              {canCreatePurchase && (
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(true)}
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
                  <span>New Purchase Inward</span>
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

          {/* Filter Bar */}
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
              <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '340px' }}>
                <Search
                  size={16}
                  color="#94A3B8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => startTransition(() => handleSearchChange(e.target.value))}
                  placeholder="Search by purchase code or invoice no..."
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

              {/* Supplier Filter */}
              <select
                value={selectedSupplierId}
                onChange={(e) => handleSupplierFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F2942',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplierCode})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusFilter(e.target.value as PurchaseStatus | 'ALL')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F2942',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(selectedSupplierId !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSupplierId('ALL');
                  setSelectedStatus('ALL');
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

          {/* Purchases Table */}
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
                      Purchase Code
                    </th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Supplier
                    </th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                      Invoice No &amp; Date
                    </th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                      Total Amount (₹)
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
                        Loading purchases ledger...
                      </td>
                    </tr>
                  ) : purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '56px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#64748B' }}>
                          <ShoppingBag size={36} color="#94A3B8" />
                          <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                            No purchase orders recorded yet
                          </span>
                          <span style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                            Create a purchase inward entry to record raw material shipments and update current stock.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    purchases.map((p) => {
                      const statusConf = PURCHASE_STATUS_CONFIG[p.status];
                      const dateStr = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '—';

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: '#087EA4' }}>
                            {p.purchaseCode}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                              {p.supplierNameSnapshot}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {p.supplierCodeSnapshot}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>
                              {p.invoiceNumber || '—'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                              {dateStr}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 700, color: '#0F2942', fontSize: '14px' }}>
                            ₹{(p.grandTotal !== undefined ? p.grandTotal : (p as unknown as { totalAmount?: number }).totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: statusConf.bgColor,
                                color: statusConf.color,
                                border: `1px solid ${statusConf.borderColor}`,
                              }}
                            >
                              {statusConf.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => setViewingPurchaseId(p.id)}
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
                          </td>
                        </tr>
                      );
                    })
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

          {/* Purchase Entry Modal */}
          {isEntryModalOpen && (
            <PurchaseEntryModal
              isOpen={isEntryModalOpen}
              onClose={() => setIsEntryModalOpen(false)}
              onSuccess={() => void fetchPurchasesList(pageCursors[page - 1] || null)}
            />
          )}

          {/* Purchase Detail Modal */}
          {viewingPurchaseId && (
            <PurchaseDetailModal
              isOpen={Boolean(viewingPurchaseId)}
              onClose={() => setViewingPurchaseId(null)}
              purchaseId={viewingPurchaseId}
            />
          )}
        </div>
      )}
    </div>
  );
};
