import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  UserCheck,
  Edit,
  CheckCircle2,
} from 'lucide-react';
import type { Lead, FollowUp } from '../../services/crm/crmTypes.ts';
import { getLead } from '../../services/crm/leads.ts';
import { getFollowUpsByLead } from '../../services/crm/followUps.ts';
import {
  LEAD_STATUS_CONFIG,
  CRM_PRIORITY_CONFIG,
  FOLLOW_UP_STATUS_CONFIG,
} from '../../constants/crm.ts';
import { FollowUpFormModal } from './FollowUpFormModal.tsx';
import { ConvertLeadModal } from './ConvertLeadModal.tsx';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string | null;
  onEditLead?: (lead: Lead) => void;
  onConverted?: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  leadId,
  onEditLead,
  onConverted,
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-modals
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  const fetchLeadData = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      setError(null);

      const [leadDoc, followUpList] = await Promise.all([
        getLead(leadId),
        getFollowUpsByLead(leadId, 50),
      ]);

      if (!leadDoc) {
        setError('Lead record not found.');
      } else {
        setLead(leadDoc);
        setFollowUps(followUpList);
      }
    } catch (err: unknown) {
      console.error('Error fetching lead details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (isOpen && leadId) {
      void fetchLeadData();
    }
  }, [isOpen, leadId, fetchLeadData]);

  if (!isOpen || !leadId) return null;

  const statusConf = lead ? LEAD_STATUS_CONFIG[lead.status] : null;
  const priorityConf = lead ? CRM_PRIORITY_CONFIG[lead.priority] : null;

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
          maxWidth: '860px',
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
              <Users2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F2942' }}>
                  {lead?.name || 'Loading Lead...'}
                </h2>
                {statusConf && (
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
                )}
                {priorityConf && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: priorityConf.bgColor,
                      color: priorityConf.color,
                      border: `1px solid ${priorityConf.borderColor}`,
                    }}
                  >
                    {priorityConf.label}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748B' }}>
                Lead Code: <strong style={{ color: '#087EA4' }}>{lead?.leadCode}</strong> | Assigned:{' '}
                <strong>{lead?.assignedTo}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lead && lead.status !== 'CONVERTED' && (
              <button
                type="button"
                onClick={() => setIsConvertModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #16A34A',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <UserCheck size={14} />
                <span>Convert to Customer</span>
              </button>
            )}

            {lead && onEditLead && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditLead(lead);
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

        {/* Content Body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
              Loading lead details...
            </div>
          ) : error || !lead ? (
            <div style={{ padding: '24px', backgroundColor: '#FEF2F2', color: '#991B1B', borderRadius: '6px' }}>
              {error || 'Lead not found'}
            </div>
          ) : (
            <>
              {/* Top Details Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                {/* Contact Information */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                    Prospect Contact Details
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Phone size={15} color="#64748B" />
                    <span>{lead.phone}</span>
                  </div>

                  {lead.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <Mail size={15} color="#64748B" />
                      <span>{lead.email}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <MapPin size={15} color="#64748B" />
                    <span>{[lead.city, lead.state, lead.industry].filter(Boolean).join(', ') || 'No location set'}</span>
                  </div>
                </div>

                {/* Pipeline & Follow-up Metadata */}
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>
                    Timeline &amp; Follow-up
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Calendar size={15} color="#64748B" />
                    <span>
                      Next Follow-up:{' '}
                      <strong>
                        {lead.nextFollowUpAt?.toDate
                          ? lead.nextFollowUpAt.toDate().toLocaleDateString()
                          : 'Not scheduled'}
                      </strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Clock size={15} color="#64748B" />
                    <span>Source Channel: <strong>{lead.source}</strong></span>
                  </div>

                  {lead.convertedCustomerId && (
                    <div
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#F3E8FF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#6B21A8',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Customer ID: {lead.convertedCustomerId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirement Summary */}
              {lead.requirementSummary && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Requirement Summary / Filtration Specs
                  </div>
                  <div style={{ fontSize: '13px', color: '#0F2942', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                    {lead.requirementSummary}
                  </div>
                </div>
              )}

              {/* Follow-up History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={17} color="#087EA4" />
                    <span>Follow-up Activities &amp; History ({followUps.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFollowUpModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
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
                    <span>Schedule Activity</span>
                  </button>
                </div>

                {followUps.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                    No follow-up interactions logged yet. Schedule a call or meeting above.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {followUps.map((f) => {
                      const fStatus = FOLLOW_UP_STATUS_CONFIG[f.status];
                      const dateStr = f.followUpAt?.toDate ? f.followUpAt.toDate().toLocaleDateString() : '—';

                      return (
                        <div
                          key={f.id}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#E0F2FE',
                                  color: '#0369A1',
                                }}
                              >
                                {f.type}
                              </span>
                              <strong style={{ fontSize: '13px', color: '#0F2942' }}>{f.subject}</strong>
                            </div>
                            {f.notes && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                                {f.notes}
                              </p>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>{dateStr}</span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: fStatus.bgColor,
                                color: fStatus.color,
                                border: `1px solid ${fStatus.borderColor}`,
                              }}
                            >
                              {fStatus.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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

        {/* FollowUp Form Modal */}
        {isFollowUpModalOpen && lead && (
          <FollowUpFormModal
            isOpen={isFollowUpModalOpen}
            onClose={() => setIsFollowUpModalOpen(false)}
            lead={lead}
            onSuccess={() => void fetchLeadData()}
          />
        )}

        {/* Convert Lead Modal */}
        {isConvertModalOpen && lead && (
          <ConvertLeadModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            lead={lead}
            onSuccess={() => {
              void fetchLeadData();
              if (onConverted) onConverted();
            }}
          />
        )}
      </div>
    </div>
  );
};
