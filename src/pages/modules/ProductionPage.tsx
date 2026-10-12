import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Plus,
  Search,
  Filter,
  Factory,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type {
  Production,
  ProductionArea,
  ProductionStatus,
} from '../../services/production/productionTypes.ts';
import { getProductions } from '../../services/production/productions.ts';
import {
  PRODUCTION_AREAS,
  getProductionAreaLabel,
  PRODUCTION_STATUS_CONFIG,
} from '../../constants/production.ts';
import { getProductUnitLabel } from '../../constants/products.ts';
import { ProductionEntryModal } from '../../components/production/ProductionEntryModal.tsx';
import { ProductionDetailModal } from '../../components/production/ProductionDetailModal.tsx';
import { useAuth } from '../../hooks/useAuth.ts';

export const ProductionPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const canCreate = hasPermission('production.create');

  // Data State
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<ProductionArea | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ProductionStatus | 'ALL'>('ALL');

  // Modal State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [viewingProductionId, setViewingProductionId] = useState<string | null>(null);

  const fetchProductionsList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);

        const res = await getProductions(
          {
            productionArea: selectedArea,
            status: selectedStatus,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );

        setProductions(res.items);
        setHasMore(res.hasMore);

        if (res.lastDoc && res.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load production logs:', err);
        setError(err instanceof Error ? err.message : 'An error occurred loading productions.');
      } finally {
        setLoading(false);
      }
    },
    [selectedArea, selectedStatus, searchQuery, page]
  );

  const handleAreaChange = (area: ProductionArea | 'ALL') => {
    setSelectedArea(area);
    setPage(1);
    setPageCursors([null]);
  };

  const handleStatusChange = (status: ProductionStatus | 'ALL') => {
    setSelectedStatus(status);
    setPage(1);
    setPageCursors([null]);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    setPageCursors([null]);
  };

  useEffect(() => {
    const currentCursor = pageCursors[page - 1] || null;
    void fetchProductionsList(currentCursor);
  }, [fetchProductionsList, page, pageCursors]);

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
            Production Execution &amp; Logs
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Atomic multi-material batch production, BOM consumption audit, and finished stock intake
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => void fetchProductionsList(pageCursors[page - 1] || null)}
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
              <span>New Production Entry</span>
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

      {/* Filter and Search Bar */}
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
              placeholder="Search by batch code or product..."
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

          {/* Area Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="#64748B" />
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value as ProductionArea | 'ALL')}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F2942',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="ALL">All Production Areas</option>
              {PRODUCTION_AREAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} ({a.description})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value as ProductionStatus | 'ALL')}
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
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Reset Filters */}
        {(selectedArea !== 'ALL' || selectedStatus !== 'ALL' || searchQuery !== '') && (
          <button
            type="button"
            onClick={() => {
              setSelectedArea('ALL');
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

      {/* Production Logs Table */}
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
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Batch Code
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Date &amp; Time
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Finished Product
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Output Quantity
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Production Area
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
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
                    colSpan={7}
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: '#64748B',
                      fontSize: '14px',
                    }}
                  >
                    Loading production history...
                  </td>
                </tr>
              ) : productions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#64748B',
                      }}
                    >
                      <Factory size={36} color="#94A3B8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                        No production batches recorded yet
                      </span>
                      <span style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                        Create a production batch entry to automatically calculate BOM consumption,
                        deduct raw materials, and record finished goods inventory.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                productions.map((p) => {
                  const statusConf = PRODUCTION_STATUS_CONFIG[p.status];
                  const dateStr = p.createdAt?.toDate
                    ? p.createdAt.toDate().toLocaleString()
                    : '—';

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#087EA4',
                        }}
                      >
                        {p.productionCode}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748B' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                          {p.productNameSnapshot}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          {p.productCodeSnapshot}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#16A34A',
                          }}
                        >
                          +{p.quantityProduced} {getProductUnitLabel(p.productUnitSnapshot)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                        {getProductionAreaLabel(p.productionArea)}
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
                          onClick={() => setViewingProductionId(p.id)}
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
                          <span>View Details</span>
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

      {/* Production Entry Modal */}
      {isEntryModalOpen && (
        <ProductionEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          onSuccess={() => void fetchProductionsList(pageCursors[page - 1] || null)}
        />
      )}

      {/* Production Details Modal */}
      {viewingProductionId && (
        <ProductionDetailModal
          isOpen={Boolean(viewingProductionId)}
          onClose={() => setViewingProductionId(null)}
          productionId={viewingProductionId}
        />
      )}
    </div>
  );
};
