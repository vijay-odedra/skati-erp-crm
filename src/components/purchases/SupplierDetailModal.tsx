import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShoppingBag,
  ExternalLink,
  Edit,
} from 'lucide-react';
import type { Supplier, Purchase } from '../../services/purchases/purchaseTypes.ts';
import { getSupplier } from '../../services/purchases/suppliers.ts';
import { getPurchasesBySupplier } from '../../services/purchases/purchases.ts';
import { PURCHASE_STATUS_CONFIG } from '../../constants/purchases.ts';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  onEditSupplier?: (supplier: Supplier) => void;
  onViewPurchase?: (purchaseId: string) => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  onEditSupplier,
  onViewPurchase,
}) => {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplierData = useCallback(async () => {
    if (!supplierId) return;
    try {
      setLoading(true);
      setError(null);

      const [supplierDoc, purchaseList] = await Promise.all([
        getSupplier(supplierId),
        getPurchasesBySupplier(supplierId, 20),
      ]);

      if (!supplierDoc) {
        setError('Supplier not found.');
      } else {
        setSupplier(supplierDoc);
        setPurchases(purchaseList);
      }
    } catch (err: unknown) {
      console.error('Error fetching supplier details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supplier details.');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (isOpen && supplierId) {
      void fetchSupplierData();
    }
  }, [isOpen, supplierId, fetchSupplierData]);

  if (!isOpen || !supplierId) return null;

  const totalSpend = purchases
    .filter((p) => p.status === 'RECEIVED')
    .reduce((sum, p) => sum + (p.grandTotal !== undefined ? p.grandTotal : (p as unknown as { totalAmount?: number }).totalAmount || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {supplier?.name || 'Loading Supplier...'}
                </h2>
                {supplier && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: supplier.isActive ? '#DCFCE7' : '#F1F5F9',
                      color: supplier.isActive ? '#15803D' : '#64748B',
                    }}
                  >
                    {supplier.isActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Supplier Code: <strong style={{ color: '#087EA4' }}>{supplier?.supplierCode}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {supplier && onEditSupplier && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSupplier(supplier);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Edit size={14} />
                <span>Edit</span>
              </button>
            )}
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
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading supplier record...
            </div>
          ) : error || !supplier ? (
            <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px' }}>
              {error || 'Supplier not found'}
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Completed Inward Orders</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F2942', marginTop: '4px' }}>
                    {purchases.filter((p) => p.status === 'RECEIVED').length}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Total Inward Spend</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#087EA4', marginTop: '4px' }}>
                    ₹{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Company Name</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F2942', marginTop: '4px' }}>
                    {supplier.companyName || supplier.name}
                  </div>
                </div>
              </div>

              {/* Contact & Business Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>Contact Information</h3>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Phone size={16} color="#64748B" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Contact Person &amp; Phone</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>
                        {supplier.contactPerson || '—'} {supplier.phone ? `(${supplier.phone})` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Mail size={16} color="#64748B" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Email Address</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>
                        {supplier.email || '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <MapPin size={16} color="#64748B" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Location / Address</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>
                        {[supplier.address, supplier.city, supplier.state].filter(Boolean).join(', ') || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>Tax &amp; Identification</h3>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <FileText size={16} color="#64748B" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>GSTIN / Tax Number</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                        {supplier.gstNumber || '—'}
                      </div>
                    </div>
                  </div>

                  {supplier.notes && (
                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>Remarks / Notes</div>
                      <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px', whiteSpace: 'pre-wrap' }}>
                        {supplier.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Purchases Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="#087EA4" />
                  <span>Purchase Inward History</span>
                </h3>

                {purchases.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                    No purchase inward orders recorded yet for this supplier.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Purchase Code</th>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Invoice No</th>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Total (₹)</th>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600 }}>Status</th>
                          <th style={{ padding: '10px 14px', color: '#64748B', fontWeight: 600, textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((p) => {
                          const statusConf = PURCHASE_STATUS_CONFIG[p.status];
                          const dateStr = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '—';
                          return (
                            <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#087EA4' }}>{p.purchaseCode}</td>
                              <td style={{ padding: '10px 14px', color: '#334155' }}>{p.invoiceNumber || '—'}</td>
                              <td style={{ padding: '10px 14px', color: '#64748B' }}>{dateStr}</td>
                              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F2942', textAlign: 'right' }}>
                                ₹{(p.grandTotal !== undefined ? p.grandTotal : (p as unknown as { totalAmount?: number }).totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: statusConf.bgColor,
                                    color: statusConf.color,
                                    border: `1px solid ${statusConf.borderColor}`,
                                  }}
                                >
                                  {statusConf.label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                {onViewPurchase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onViewPurchase(p.id);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #E2E8F0',
                                      backgroundColor: '#FFFFFF',
                                      color: '#475569',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ExternalLink size={12} />
                                    <span>Details</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
