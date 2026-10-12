import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Plus,
  Search,
  Filter,
  Layers,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Package,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type {
  Product,
  ProductCategory,
  ProductUnit,
  BomStatus,
  CreateProductInput,
  UpdateProductInput,
} from '../../services/products/productTypes.ts';
import {
  getProducts,
  createProduct,
  updateProduct,
} from '../../services/products/products.ts';
import { getProductBomStatusMap } from '../../services/products/bom.ts';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  getProductUnitLabel,
  BOM_STATUS_CONFIG,
} from '../../constants/products.ts';
import { ProductFormModal } from '../../components/products/ProductFormModal.tsx';
import { BomManagementModal } from '../../components/products/BomManagementModal.tsx';
import { useAuth } from '../../hooks/useAuth.ts';

export const ProductsPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const canCreate = hasPermission('products.create');
  const canUpdate = hasPermission('products.update');
  const canViewBom = hasPermission('bom.view');

  // Data & Status State
  const [products, setProducts] = useState<Product[]>([]);
  const [bomStatusMap, setBomStatusMap] = useState<Record<string, BomStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'ALL'>('ALL');
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | 'ALL'>('ALL');
  const [selectedActiveStatus, setSelectedActiveStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [selectedBomFilter, setSelectedBomFilter] = useState<'ALL' | 'COMPLETE' | 'NO_BOM'>('ALL');

  // Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [activeBomProduct, setActiveBomProduct] = useState<Product | null>(null);

  // Load Products with Pagination and BOM Status
  const fetchProductsList = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);

        const result = await getProducts(
          {
            category: selectedCategory,
            unit: selectedUnit,
            activeStatus: selectedActiveStatus,
            searchQuery: searchQuery.trim(),
            pageSize,
          },
          cursor
        );

        // Fetch BOM status for loaded products
        const productIds = result.items.map((p) => p.id);
        const bMap = await getProductBomStatusMap(productIds);

        setProducts(result.items);
        setBomStatusMap(bMap);
        setHasMore(result.hasMore);

        // Store next cursor
        if (result.lastDoc && result.hasMore) {
          setPageCursors((prev) => {
            const next = [...prev];
            next[page] = result.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Failed to load products:', err);
        setError(err instanceof Error ? err.message : 'An error occurred loading products.');
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, selectedUnit, selectedActiveStatus, searchQuery, page]
  );

  // Handle filter changes by resetting to first page
  const handleFilterCategoryChange = (val: ProductCategory | 'ALL') => {
    setSelectedCategory(val);
    setPage(1);
    setPageCursors([null]);
  };

  const handleFilterUnitChange = (val: ProductUnit | 'ALL') => {
    setSelectedUnit(val);
    setPage(1);
    setPageCursors([null]);
  };

  const handleFilterActiveChange = (val: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    setSelectedActiveStatus(val);
    setPage(1);
    setPageCursors([null]);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
    setPageCursors([null]);
  };

  useEffect(() => {
    const currentCursor = pageCursors[page - 1] || null;
    void fetchProductsList(currentCursor);
  }, [fetchProductsList, page, pageCursors]);

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

  // Create / Edit Product Form Submission
  const handleProductFormSubmit = async (input: CreateProductInput | UpdateProductInput) => {
    const userUid = user?.uid || 'system';
    if (productToEdit) {
      await updateProduct(productToEdit.id, input, userUid);
    } else {
      await createProduct(input as CreateProductInput, userUid);
    }
    void fetchProductsList(pageCursors[page - 1] || null);
  };

  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleOpenBomModal = (p: Product) => {
    setActiveBomProduct(p);
  };

  // Client-side BOM Status filtering on top of fetched items
  const displayedProducts = products.filter((p) => {
    if (selectedBomFilter === 'ALL') return true;
    const status = bomStatusMap[p.id] || 'NO_BOM';
    return status === selectedBomFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
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
            Product Master &amp; Bill of Materials
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
            Finished goods catalog, component bill of materials (BOM), and specifications
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => void fetchProductsList(pageCursors[page - 1] || null)}
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
              onClick={handleOpenCreateModal}
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
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
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
              placeholder="Search product code or name..."
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

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="#64748B" />
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterCategoryChange(e.target.value as ProductCategory | 'ALL')}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                color: '#0F2942',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="ALL">All Categories</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={(e) => handleFilterUnitChange(e.target.value as ProductUnit | 'ALL')}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F2942',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">All Units</option>
            {PRODUCT_UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>

          {/* BOM Status Filter */}
          <select
            value={selectedBomFilter}
            onChange={(e) => setSelectedBomFilter(e.target.value as 'ALL' | 'COMPLETE' | 'NO_BOM')}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '13px',
              color: '#0F2942',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">All BOM Statuses</option>
            <option value="COMPLETE">Complete BOM</option>
            <option value="NO_BOM">No BOM</option>
          </select>

          {/* Active Status Filter */}
          <select
            value={selectedActiveStatus}
            onChange={(e) => handleFilterActiveChange(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
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
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>

        {/* Clear Filters helper */}
        {(selectedCategory !== 'ALL' ||
          selectedUnit !== 'ALL' ||
          selectedActiveStatus !== 'ALL' ||
          selectedBomFilter !== 'ALL' ||
          searchQuery !== '') && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedUnit('ALL');
              setSelectedActiveStatus('ALL');
              setSelectedBomFilter('ALL');
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

      {/* Products Table Card */}
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
                  Product Code
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
                  Product Name
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
                  Category
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
                  Unit
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
                  BOM Status
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
                  }}
                >
                  Updated At
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
                    colSpan={8}
                    style={{
                      padding: '48px 20px',
                      textAlign: 'center',
                      color: '#64748B',
                      fontSize: '14px',
                    }}
                  >
                    Loading product catalog...
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '56px 20px', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#64748B',
                      }}
                    >
                      <Package size={36} color="#94A3B8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
                        No products found
                      </span>
                      <span style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '380px' }}>
                        Try adjusting your search criteria or register a new product to build its bill
                        of materials.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product) => {
                  const bomStatus = bomStatusMap[product.id] || 'NO_BOM';
                  const bomConfig = BOM_STATUS_CONFIG[bomStatus];
                  const updatedAtStr = product.updatedAt?.toDate
                    ? product.updatedAt.toDate().toLocaleDateString()
                    : '—';

                  return (
                    <tr
                      key={product.id}
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
                        {product.productCode}
                      </td>
                      <td
                        style={{
                          padding: '14px 20px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#0F2942',
                        }}
                      >
                        {product.name}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                        {product.category}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#475569' }}>
                        {getProductUnitLabel(product.unit)}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: bomConfig.bgColor,
                            color: bomConfig.color,
                            border: `1px solid ${bomConfig.borderColor}`,
                          }}
                        >
                          {bomConfig.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: product.isActive ? '#DCFCE7' : '#F1F5F9',
                            color: product.isActive ? '#16A34A' : '#64748B',
                            border: `1px solid ${product.isActive ? '#BBF7D0' : '#E2E8F0'}`,
                          }}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '13px', color: '#64748B' }}>
                        {updatedAtStr}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '8px',
                          }}
                        >
                          {canViewBom && (
                            <button
                              type="button"
                              onClick={() => handleOpenBomModal(product)}
                              title="Manage BOM components"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: '1px solid #BAE6FD',
                                backgroundColor: '#F0F9FF',
                                color: '#0369A1',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Layers size={14} />
                              <span>Manage BOM</span>
                            </button>
                          )}

                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              title="Edit product master"
                              style={{
                                display: 'flex',
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
                              <Edit2 size={13} />
                              <span>Edit</span>
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

      {/* Product Create/Edit Modal */}
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSubmit={handleProductFormSubmit}
          productToEdit={productToEdit}
          hasBomItems={productToEdit ? bomStatusMap[productToEdit.id] === 'COMPLETE' : false}
        />
      )}

      {/* BOM Management Modal */}
      {activeBomProduct && (
        <BomManagementModal
          isOpen={Boolean(activeBomProduct)}
          onClose={() => setActiveBomProduct(null)}
          product={activeBomProduct}
          onBomUpdated={() => void fetchProductsList(pageCursors[page - 1] || null)}
        />
      )}
    </div>
  );
};
