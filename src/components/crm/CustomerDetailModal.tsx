import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileSpreadsheet,
  Plus,
  Edit,
} from 'lucide-react';
import type { Customer, CustomerRequirement, Quotation } from '../../services/crm/crmTypes.ts';
import { getCustomer } from '../../services/crm/customers.ts';
import { getRequirements } from '../../services/crm/requirements.ts';
import { getQuotations } from '../../services/crm/quotations.ts';
import {
  REQUIREMENT_STATUS_CONFIG,
  QUOTATION_STATUS_CONFIG,
} from '../../constants/crm.ts';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onEditCustomer?: (customer: Customer) => void;
  onNewRequirement?: (customer: Customer) => void;
  onNewQuotation?: (customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onEditCustomer,
  onNewRequirement,
  onNewQuotation,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [requirements, setRequirements] = useState<CustomerRequirement[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);

      const [custDoc, reqRes, quoRes] = await Promise.all([
        getCustomer(customerId),
        getRequirements({ customerId, pageSize: 20 }),
        getQuotations({ customerId, pageSize: 20 }),
      ]);

      if (!custDoc) {
        setError('Customer not found.');
      } else {
        setCustomer(custDoc);
        setRequirements(reqRes.items);
        setQuotations(quoRes.items);
      }
    } catch (err: unknown) {
      console.error('Error fetching customer details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load customer details.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen && customerId) {
      void fetchCustomerData();
    }
  }, [isOpen, customerId, fetchCustomerData]);

  if (!isOpen || !customerId) return null;

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
          maxWidth: '880px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
                  {customer?.name || 'Loading Customer...'}
                </h2>
                {customer && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: customer.isActive ? '#DCFCE7' : '#F1F5F9',
                      color: customer.isActive ? '#15803D' : '#64748B',
                    }}
                  >
                    {customer.isActive ? 'Active Client' : 'Inactive'}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Code: <strong style={{ color: '#087EA4' }}>{customer?.customerCode}</strong> | Account Exec:{' '}
                <strong>{customer?.assignedTo}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {customer && onEditCustomer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditCustomer(customer);
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

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading customer record...
            </div>
          ) : error || !customer ? (
            <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px' }}>
              {error || 'Customer not found'}
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>Contact Information</h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Phone size={15} color="#64748B" />
                    <span>{customer.contactPerson ? `${customer.contactPerson} (${customer.phone})` : customer.phone}</span>
                  </div>

                  {customer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <Mail size={15} color="#64748B" />
                      <span>{customer.email}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <MapPin size={15} color="#64748B" />
                    <span>{[customer.city, customer.state].filter(Boolean).join(', ') || 'No location set'}</span>
                  </div>
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>Billing &amp; Tax</h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <FileText size={15} color="#64748B" />
                    <span>GSTIN: <strong>{customer.gstNumber || 'Unregistered'}</strong></span>
                  </div>

                  {customer.billingAddress && (
                    <div style={{ fontSize: '13px', color: '#475569' }}>
                      Billing: {customer.billingAddress}
                    </div>
                  )}

                  {customer.notes && (
                    <div style={{ fontSize: '12px', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                      Notes: {customer.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={17} color="#087EA4" />
                    <span>Active Requirements &amp; Inquiries ({requirements.length})</span>
                  </h3>
                  {onNewRequirement && (
                    <button
                      type="button"
                      onClick={() => onNewRequirement(customer)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid #087EA4',
                        backgroundColor: '#E0F2FE',
                        color: '#087EA4',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Requirement</span>
                    </button>
                  )}
                </div>

                {requirements.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '8px', fontSize: '13px' }}>
                    No requirements logged yet.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Code</th>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Title</th>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Product</th>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requirements.map((r) => {
                          const rStatus = REQUIREMENT_STATUS_CONFIG[r.status];
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#087EA4' }}>{r.requirementCode}</td>
                              <td style={{ padding: '8px 12px', color: '#0F2942' }}>{r.title}</td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>{r.productNameSnapshot || 'Custom'}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: rStatus.bgColor,
                                    color: rStatus.color,
                                    border: `1px solid ${rStatus.borderColor}`,
                                  }}
                                >
                                  {rStatus.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quotations List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={17} color="#087EA4" />
                    <span>Quotation History ({quotations.length})</span>
                  </h3>
                  {onNewQuotation && (
                    <button
                      type="button"
                      onClick={() => onNewQuotation(customer)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid #087EA4',
                        backgroundColor: '#E0F2FE',
                        color: '#087EA4',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      <span>Prepare Quotation</span>
                    </button>
                  )}
                </div>

                {quotations.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '8px', fontSize: '13px' }}>
                    No quotations generated for this client yet.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <tr>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Code</th>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Date</th>
                          <th style={{ padding: '8px 12px', color: '#64748B', textAlign: 'right' }}>Total (₹)</th>
                          <th style={{ padding: '8px 12px', color: '#64748B' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotations.map((q) => {
                          const qStatus = QUOTATION_STATUS_CONFIG[q.status];
                          const dateStr = q.quotationDate?.toDate ? q.quotationDate.toDate().toLocaleDateString() : '—';
                          return (
                            <tr key={q.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#087EA4' }}>{q.quotationCode}</td>
                              <td style={{ padding: '8px 12px', color: '#64748B' }}>{dateStr}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#0F2942' }}>
                                ₹{q.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: qStatus.bgColor,
                                    color: qStatus.color,
                                    border: `1px solid ${qStatus.borderColor}`,
                                  }}
                                >
                                  {qStatus.label}
                                </span>
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
