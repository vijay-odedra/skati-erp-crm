import React, { useState, useEffect, useCallback, useTransition } from 'react';
import {
  Users2,
  Calendar,
  Building2,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type {
  Lead,
  FollowUp,
  Customer,
  CustomerRequirement,
  Quotation,
  LeadStatus,
  CrmPriority,
} from '../../services/crm/crmTypes.ts';
import { getLeads } from '../../services/crm/leads.ts';
import { getPendingFollowUps } from '../../services/crm/followUps.ts';
import { getCustomers } from '../../services/crm/customers.ts';
import { getRequirements } from '../../services/crm/requirements.ts';
import { getQuotations } from '../../services/crm/quotations.ts';
import {
  LEAD_STATUS_CONFIG,
  CRM_PRIORITY_CONFIG,
  FOLLOW_UP_STATUS_CONFIG,
  REQUIREMENT_STATUS_CONFIG,
  QUOTATION_STATUS_CONFIG,
} from '../../constants/crm.ts';
import { LeadFormModal } from '../../components/crm/LeadFormModal.tsx';
import { LeadDetailModal } from '../../components/crm/LeadDetailModal.tsx';
import { CustomerFormModal } from '../../components/crm/CustomerFormModal.tsx';
import { CustomerDetailModal } from '../../components/crm/CustomerDetailModal.tsx';
import { RequirementFormModal } from '../../components/crm/RequirementFormModal.tsx';
import { QuotationFormModal } from '../../components/crm/QuotationFormModal.tsx';
import { QuotationDetailModal } from '../../components/crm/QuotationDetailModal.tsx';
import { useAuth } from '../../hooks/useAuth.ts';

type CrmTab = 'leads' | 'followups' | 'customers' | 'requirements' | 'quotations';

export const CRMPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<CrmTab>('leads');
  const canCreate = hasPermission('crm.create');

  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadCursors, setLeadCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [leadHasMore, setLeadHasMore] = useState(false);
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [leadPriorityFilter, setLeadPriorityFilter] = useState<CrmPriority | 'ALL'>('ALL');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // Follow-ups State
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Customers State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerCursors, setCustomerCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [customerHasMore, setCustomerHasMore] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Requirements State
  const [requirements, setRequirements] = useState<CustomerRequirement[]>([]);
  const [requirementPage, setRequirementPage] = useState(1);
  const [requirementCursors, setRequirementCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [requirementHasMore, setRequirementHasMore] = useState(false);
  const [requirementSearchQuery, setRequirementSearchQuery] = useState('');

  // Quotations State
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationPage, setQuotationPage] = useState(1);
  const [quotationCursors, setQuotationCursors] = useState<(DocumentSnapshot | null)[]>([null]);
  const [quotationHasMore, setQuotationHasMore] = useState(false);
  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);

  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);

  const [isRequirementFormOpen, setIsRequirementFormOpen] = useState(false);
  const [selectedCustomerForReq, setSelectedCustomerForReq] = useState<Customer | null>(null);

  const [isQuotationFormOpen, setIsQuotationFormOpen] = useState(false);
  const [selectedCustomerForQuo, setSelectedCustomerForQuo] = useState<Customer | null>(null);
  const [viewingQuotationId, setViewingQuotationId] = useState<string | null>(null);

  // Fetch Leads
  const fetchLeadsData = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);
        const res = await getLeads(
          {
            status: leadStatusFilter,
            priority: leadPriorityFilter,
            searchQuery: leadSearchQuery.trim(),
            pageSize: 20,
          },
          cursor
        );
        setLeads(res.items);
        setLeadHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setLeadCursors((prev) => {
            const next = [...prev];
            next[leadPage] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Error fetching leads:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leads.');
      } finally {
        setLoading(false);
      }
    },
    [leadStatusFilter, leadPriorityFilter, leadSearchQuery, leadPage]
  );

  // Fetch FollowUps
  const fetchFollowUpsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPendingFollowUps(30);
      setFollowUps(res);
    } catch (err: unknown) {
      console.error('Error fetching follow-ups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Customers
  const fetchCustomersData = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);
        const res = await getCustomers(
          {
            searchQuery: customerSearchQuery.trim(),
            pageSize: 20,
          },
          cursor
        );
        setCustomers(res.items);
        setCustomerHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setCustomerCursors((prev) => {
            const next = [...prev];
            next[customerPage] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Error fetching customers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load customers.');
      } finally {
        setLoading(false);
      }
    },
    [customerSearchQuery, customerPage]
  );

  // Fetch Requirements
  const fetchRequirementsData = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);
        const res = await getRequirements(
          {
            searchQuery: requirementSearchQuery.trim(),
            pageSize: 20,
          },
          cursor
        );
        setRequirements(res.items);
        setRequirementHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setRequirementCursors((prev) => {
            const next = [...prev];
            next[requirementPage] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Error fetching requirements:', err);
        setError(err instanceof Error ? err.message : 'Failed to load requirements.');
      } finally {
        setLoading(false);
      }
    },
    [requirementSearchQuery, requirementPage]
  );

  // Fetch Quotations
  const fetchQuotationsData = useCallback(
    async (cursor: DocumentSnapshot | null = null) => {
      try {
        setLoading(true);
        setError(null);
        const res = await getQuotations(
          {
            searchQuery: quotationSearchQuery.trim(),
            pageSize: 20,
          },
          cursor
        );
        setQuotations(res.items);
        setQuotationHasMore(res.hasMore);
        if (res.lastDoc && res.hasMore) {
          setQuotationCursors((prev) => {
            const next = [...prev];
            next[quotationPage] = res.lastDoc;
            return next;
          });
        }
      } catch (err: unknown) {
        console.error('Error fetching quotations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quotations.');
      } finally {
        setLoading(false);
      }
    },
    [quotationSearchQuery, quotationPage]
  );

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'leads') {
      const cursor = leadCursors[leadPage - 1] || null;
      void fetchLeadsData(cursor);
    } else if (activeTab === 'followups') {
      void fetchFollowUpsData();
    } else if (activeTab === 'customers') {
      const cursor = customerCursors[customerPage - 1] || null;
      void fetchCustomersData(cursor);
    } else if (activeTab === 'requirements') {
      const cursor = requirementCursors[requirementPage - 1] || null;
      void fetchRequirementsData(cursor);
    } else if (activeTab === 'quotations') {
      const cursor = quotationCursors[quotationPage - 1] || null;
      void fetchQuotationsData(cursor);
    }
  }, [
    activeTab,
    fetchLeadsData,
    fetchFollowUpsData,
    fetchCustomersData,
    fetchRequirementsData,
    fetchQuotationsData,
    leadPage,
    leadCursors,
    customerPage,
    customerCursors,
    requirementPage,
    requirementCursors,
    quotationPage,
    quotationCursors,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'leads' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'leads' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'leads' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'leads' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Users2 size={17} />
          <span>Leads &amp; Pipeline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followups')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'followups' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'followups' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'followups' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'followups' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Calendar size={17} />
          <span>Follow-up Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'customers' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'customers' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'customers' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'customers' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <Building2 size={17} />
          <span>Customer Directory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requirements')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'requirements' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'requirements' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'requirements' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'requirements' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <FileSpreadsheet size={17} />
          <span>Requirements / Inquiries</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quotations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'quotations' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'quotations' ? '#087EA4' : '#64748B',
            fontWeight: activeTab === 'quotations' ? 700 : 500,
            fontSize: '14px',
            cursor: 'pointer',
            borderBottom: activeTab === 'quotations' ? '3px solid #087EA4' : '3px solid transparent',
            marginBottom: '-2px',
            whiteSpace: 'nowrap',
          }}
        >
          <FileText size={17} />
          <span>Quotations</span>
        </button>
      </div>

      {/* Error Display */}
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

      {/* TAB 1: LEADS & PIPELINE */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
                Client Leads &amp; Inquiry Pipeline
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Manage prospective inquiries, track follow-up progress, and convert leads to verified customers
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => void fetchLeadsData(leadCursors[leadPage - 1] || null)}
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
                    setEditingLead(null);
                    setIsLeadFormOpen(true);
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
                  <span>New Lead</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #D9EAF0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '320px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={leadSearchQuery}
                onChange={(e) => startTransition(() => {
                  setLeadSearchQuery(e.target.value);
                  setLeadPage(1);
                  setLeadCursors([null]);
                })}
                placeholder="Search leads by name, code, city..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <select
              value={leadStatusFilter}
              onChange={(e) => {
                setLeadStatusFilter(e.target.value as LeadStatus | 'ALL');
                setLeadPage(1);
                setLeadCursors([null]);
              }}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="QUOTATION">Quotation</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="CONVERTED">Converted</option>
            </select>

            <select
              value={leadPriorityFilter}
              onChange={(e) => {
                setLeadPriorityFilter(e.target.value as CrmPriority | 'ALL');
                setLeadPage(1);
                setLeadCursors([null]);
              }}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Leads Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #D9EAF0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Lead Code</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Contact Name</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Company &amp; City</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Assigned To</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                      Loading lead inquiries...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      No leads found. Create a new lead to begin tracking client inquiries.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const statusConf = LEAD_STATUS_CONFIG[lead.status];
                    const priorityConf = CRM_PRIORITY_CONFIG[lead.priority];

                    return (
                      <tr key={lead.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 700, color: '#087EA4' }}>
                          {lead.leadCode}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                          {lead.name}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#475569' }}>
                          {lead.companyName || 'Individual'} {lead.city ? `(${lead.city})` : ''}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#334155' }}>
                          {lead.phone}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: statusConf.bgColor,
                              color: statusConf.color,
                              border: `1px solid ${statusConf.borderColor}`,
                            }}
                          >
                            {statusConf.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: priorityConf.bgColor,
                              color: priorityConf.color,
                            }}
                          >
                            {priorityConf.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#64748B' }}>
                          {lead.assignedTo}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setViewingLeadId(lead.id)}
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
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
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
                Showing Page <strong style={{ color: '#0F2942' }}>{leadPage}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setLeadPage((p) => Math.max(1, p - 1))}
                  disabled={leadPage <= 1 || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: leadPage <= 1 ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: leadPage <= 1 || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadPage((p) => p + 1)}
                  disabled={!leadHasMore || loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: !leadHasMore ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: !leadHasMore || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FOLLOW-UPS SCHEDULE */}
      {activeTab === 'followups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
                Scheduled Client Follow-ups
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Upcoming meetings, phone calls, and technical discussions
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchFollowUpsData()}
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
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #D9EAF0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Type</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Lead Code</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Subject / Purpose</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Scheduled Date</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      Loading scheduled follow-ups...
                    </td>
                  </tr>
                ) : followUps.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      No pending follow-ups scheduled.
                    </td>
                  </tr>
                ) : (
                  followUps.map((f) => {
                    const fStatus = FOLLOW_UP_STATUS_CONFIG[f.status];
                    const dateStr = f.followUpAt?.toDate ? f.followUpAt.toDate().toLocaleDateString() : '—';
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1' }}>
                            {f.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 600, color: '#087EA4' }}>
                          {f.leadCodeSnapshot}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>
                          {f.subject}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#64748B' }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: fStatus.bgColor, color: fStatus.color }}>
                            {fStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setViewingLeadId(f.leadId)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Open Lead
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER DIRECTORY */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
                Customer Directory
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Verified client accounts, GSTIN tax credentials, and order histories
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => void fetchCustomersData(customerCursors[customerPage - 1] || null)}
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
                    setEditingCustomer(null);
                    setIsCustomerFormOpen(true);
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
                  }}
                >
                  <Plus size={18} />
                  <span>Add Customer</span>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: '8px', border: '1px solid #D9EAF0' }}>
            <div style={{ position: 'relative', maxWidth: '340px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => startTransition(() => {
                  setCustomerSearchQuery(e.target.value);
                  setCustomerPage(1);
                  setCustomerCursors([null]);
                })}
                placeholder="Search customers by name, code, phone..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Customer Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #D9EAF0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Customer Code</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Customer Name</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Company</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Phone &amp; City</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>GSTIN</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      Loading customer directory...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      No customers registered yet. Convert a qualified lead or add directly above.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 700, color: '#087EA4' }}>
                        {c.customerCode}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', color: '#475569' }}>
                        {c.companyName || '—'}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', color: '#334155' }}>
                        {c.phone} {c.city ? `(${c.city})` : ''}
                      </td>
                      <td style={{ padding: '12px 18px', fontSize: '13px', color: '#64748B' }}>
                        {c.gstNumber || 'Unregistered'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: c.isActive ? '#DCFCE7' : '#F1F5F9',
                            color: c.isActive ? '#15803D' : '#64748B',
                          }}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setViewingCustomerId(c.id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Page {customerPage} {customers.length > 0 && `(${customers.length} records displayed)`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={customerPage === 1 || loading}
                  onClick={() => {
                    const prevPage = customerPage - 1;
                    setCustomerPage(prevPage);
                    void fetchCustomersData(customerCursors[prevPage - 1] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: customerPage === 1 ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: customerPage === 1 || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={!customerHasMore || loading}
                  onClick={() => {
                    const nextPage = customerPage + 1;
                    setCustomerPage(nextPage);
                    void fetchCustomersData(customerCursors[customerPage] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: !customerHasMore ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: !customerHasMore || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REQUIREMENTS / INQUIRIES */}
      {activeTab === 'requirements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
                Customer Requirements &amp; Inquiries
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Capture custom filter specs, expected quantities, and prepare quotations
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => void fetchRequirementsData(requirementCursors[requirementPage - 1] || null)}
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
                    setSelectedCustomerForReq(null);
                    setIsRequirementFormOpen(true);
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
                  }}
                >
                  <Plus size={18} />
                  <span>Log Requirement</span>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: '8px', border: '1px solid #D9EAF0' }}>
            <div style={{ position: 'relative', maxWidth: '340px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={requirementSearchQuery}
                onChange={(e) => startTransition(() => {
                  setRequirementSearchQuery(e.target.value);
                  setRequirementPage(1);
                  setRequirementCursors([null]);
                })}
                placeholder="Search requirements by code, title, customer..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Requirements Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #D9EAF0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Code</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Customer</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Title &amp; Target Product</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Quantity</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      Loading requirements...
                    </td>
                  </tr>
                ) : requirements.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      No customer requirements logged.
                    </td>
                  </tr>
                ) : (
                  requirements.map((r) => {
                    const rStatus = REQUIREMENT_STATUS_CONFIG[r.status];
                    const rPriority = CRM_PRIORITY_CONFIG[r.priority];
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 700, color: '#087EA4' }}>
                          {r.requirementCode}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                          {r.customerNameSnapshot}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#0F2942' }}>{r.title}</div>
                          {r.productNameSnapshot && (
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Product: {r.productNameSnapshot}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#334155' }}>
                          {r.quantity ? `${r.quantity} ${r.unit}` : '—'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: rStatus.bgColor, color: rStatus.color }}>
                            {rStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: rPriority.bgColor, color: rPriority.color }}>
                            {rPriority.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Page {requirementPage} {requirements.length > 0 && `(${requirements.length} records displayed)`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={requirementPage === 1 || loading}
                  onClick={() => {
                    const prevPage = requirementPage - 1;
                    setRequirementPage(prevPage);
                    void fetchRequirementsData(requirementCursors[prevPage - 1] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: requirementPage === 1 ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: requirementPage === 1 || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={!requirementHasMore || loading}
                  onClick={() => {
                    const nextPage = requirementPage + 1;
                    setRequirementPage(nextPage);
                    void fetchRequirementsData(requirementCursors[requirementPage] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: !requirementHasMore ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: !requirementHasMore || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0F2942' }}>
                Commercial Quotations
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748B' }}>
                Client price quotes, item schedules, GST tax schedules, and approval status
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => void fetchQuotationsData(quotationCursors[quotationPage - 1] || null)}
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
                    setSelectedCustomerForQuo(null);
                    setIsQuotationFormOpen(true);
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
                  }}
                >
                  <Plus size={18} />
                  <span>Prepare Quotation</span>
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px 18px', borderRadius: '8px', border: '1px solid #D9EAF0' }}>
            <div style={{ position: 'relative', maxWidth: '340px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={quotationSearchQuery}
                onChange={(e) => startTransition(() => {
                  setQuotationSearchQuery(e.target.value);
                  setQuotationPage(1);
                  setQuotationCursors([null]);
                })}
                placeholder="Search quotations by code, customer..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #D9EAF0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Quotation Code</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Customer</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Date</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
                      No quotations recorded yet.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => {
                    const qStatus = QUOTATION_STATUS_CONFIG[q.status];
                    const dateStr = q.quotationDate?.toDate ? q.quotationDate.toDate().toLocaleDateString() : '—';
                    return (
                      <tr key={q.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 700, color: '#087EA4' }}>
                          {q.quotationCode}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                          {q.customerNameSnapshot}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '13px', color: '#64748B' }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: '#0F2942' }}>
                          ₹{(q.grandTotal !== undefined ? q.grandTotal : (q as unknown as { totalAmount?: number }).totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: qStatus.bgColor, color: qStatus.color, border: `1px solid ${qStatus.borderColor}` }}>
                            {qStatus.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => setViewingQuotationId(q.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#475569',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div
              style={{
                padding: '12px 18px',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Page {quotationPage} {quotations.length > 0 && `(${quotations.length} records displayed)`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  disabled={quotationPage === 1 || loading}
                  onClick={() => {
                    const prevPage = quotationPage - 1;
                    setQuotationPage(prevPage);
                    void fetchQuotationsData(quotationCursors[prevPage - 1] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: quotationPage === 1 ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: quotationPage === 1 || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  disabled={!quotationHasMore || loading}
                  onClick={() => {
                    const nextPage = quotationPage + 1;
                    setQuotationPage(nextPage);
                    void fetchQuotationsData(quotationCursors[quotationPage] || null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: !quotationHasMore ? '#94A3B8' : '#0F2942',
                    fontSize: '13px',
                    cursor: !quotationHasMore || loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Lead Create/Edit Modal */}
      {isLeadFormOpen && (
        <LeadFormModal
          isOpen={isLeadFormOpen}
          onClose={() => setIsLeadFormOpen(false)}
          initialLead={editingLead}
          onSuccess={() => void fetchLeadsData(leadCursors[leadPage - 1] || null)}
        />
      )}

      {/* Lead Detail Modal */}
      {viewingLeadId && (
        <LeadDetailModal
          isOpen={Boolean(viewingLeadId)}
          onClose={() => setViewingLeadId(null)}
          leadId={viewingLeadId}
          onEditLead={(l) => {
            setEditingLead(l);
            setIsLeadFormOpen(true);
          }}
          onConverted={() => {
            void fetchLeadsData(leadCursors[leadPage - 1] || null);
            void fetchCustomersData();
          }}
        />
      )}

      {/* Customer Create/Edit Modal */}
      {isCustomerFormOpen && (
        <CustomerFormModal
          isOpen={isCustomerFormOpen}
          onClose={() => setIsCustomerFormOpen(false)}
          initialCustomer={editingCustomer}
          onSuccess={() => void fetchCustomersData(customerCursors[customerPage - 1] || null)}
        />
      )}

      {/* Customer Detail Modal */}
      {viewingCustomerId && (
        <CustomerDetailModal
          isOpen={Boolean(viewingCustomerId)}
          onClose={() => setViewingCustomerId(null)}
          customerId={viewingCustomerId}
          onEditCustomer={(c) => {
            setEditingCustomer(c);
            setIsCustomerFormOpen(true);
          }}
          onNewRequirement={(c) => {
            setSelectedCustomerForReq(c);
            setIsRequirementFormOpen(true);
          }}
          onNewQuotation={(c) => {
            setSelectedCustomerForQuo(c);
            setIsQuotationFormOpen(true);
          }}
        />
      )}

      {/* Requirement Form Modal */}
      {isRequirementFormOpen && (
        <RequirementFormModal
          isOpen={isRequirementFormOpen}
          onClose={() => setIsRequirementFormOpen(false)}
          defaultCustomer={selectedCustomerForReq}
          onSuccess={() => void fetchRequirementsData(requirementCursors[requirementPage - 1] || null)}
        />
      )}

      {/* Quotation Form Modal */}
      {isQuotationFormOpen && (
        <QuotationFormModal
          isOpen={isQuotationFormOpen}
          onClose={() => setIsQuotationFormOpen(false)}
          defaultCustomer={selectedCustomerForQuo}
          onSuccess={() => void fetchQuotationsData(quotationCursors[quotationPage - 1] || null)}
        />
      )}

      {/* Quotation Detail Modal */}
      {viewingQuotationId && (
        <QuotationDetailModal
          isOpen={Boolean(viewingQuotationId)}
          onClose={() => setViewingQuotationId(null)}
          quotationId={viewingQuotationId}
          onStatusUpdated={() => void fetchQuotationsData(quotationCursors[quotationPage - 1] || null)}
        />
      )}
    </div>
  );
};
