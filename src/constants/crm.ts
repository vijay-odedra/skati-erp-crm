import type {
  LeadSource,
  LeadStatus,
  CrmPriority,
  FollowUpType,
  FollowUpStatus,
  RequirementStatus,
  QuotationStatus,
} from '../services/crm/crmTypes.ts';

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: 'WEBSITE', label: 'Website Inquiry' },
  { value: 'PHONE', label: 'Direct Phone Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REFERENCE', label: 'Client Reference' },
  { value: 'WALK_IN', label: 'Walk-In / Exhibition' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'OTHER', label: 'Other Channel' },
];

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; bgColor: string; color: string; borderColor: string }
> = {
  NEW: { label: 'New Lead', bgColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' },
  CONTACTED: { label: 'Contacted', bgColor: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' },
  QUALIFIED: { label: 'Qualified', bgColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' },
  QUOTATION: { label: 'Quoted', bgColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' },
  NEGOTIATION: { label: 'Negotiation', bgColor: '#FFF7ED', color: '#C2410C', borderColor: '#FFEDD5' },
  WON: { label: 'Deal Won', bgColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' },
  LOST: { label: 'Deal Lost', bgColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
  CONVERTED: { label: 'Converted to Customer', bgColor: '#F3E8FF', color: '#6B21A8', borderColor: '#DDD6FE' },
};

export const CRM_PRIORITY_CONFIG: Record<
  CrmPriority,
  { label: string; bgColor: string; color: string; borderColor: string }
> = {
  LOW: { label: 'Low', bgColor: '#F1F5F9', color: '#475569', borderColor: '#CBD5E1' },
  MEDIUM: { label: 'Medium', bgColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' },
  HIGH: { label: 'High', bgColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' },
  URGENT: { label: 'Urgent', bgColor: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' },
};

export const FOLLOW_UP_TYPES: { value: FollowUpType; label: string }[] = [
  { value: 'CALL', label: 'Phone Call' },
  { value: 'MEETING', label: 'Client Meeting' },
  { value: 'WHATSAPP', label: 'WhatsApp Message' },
  { value: 'EMAIL', label: 'Email Follow-up' },
  { value: 'VISIT', label: 'Factory / Site Visit' },
  { value: 'OTHER', label: 'Other Activity' },
];

export const FOLLOW_UP_STATUS_CONFIG: Record<
  FollowUpStatus,
  { label: string; bgColor: string; color: string; borderColor: string }
> = {
  PENDING: { label: 'Scheduled', bgColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' },
  COMPLETED: { label: 'Completed', bgColor: '#DCFCE7', color: '#15803D', borderColor: '#BBF7D0' },
  CANCELLED: { label: 'Cancelled', bgColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' },
};

export const REQUIREMENT_STATUS_CONFIG: Record<
  RequirementStatus,
  { label: string; bgColor: string; color: string; borderColor: string }
> = {
  OPEN: { label: 'Open Inquiry', bgColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' },
  IN_PROGRESS: { label: 'In Review', bgColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' },
  QUOTED: { label: 'Quotation Sent', bgColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' },
  WON: { label: 'Order Confirmed', bgColor: '#DCFCE7', color: '#15803D', borderColor: '#BBF7D0' },
  LOST: { label: 'Closed / Lost', bgColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
  CANCELLED: { label: 'Cancelled', bgColor: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' },
};

export const QUOTATION_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; bgColor: string; color: string; borderColor: string }
> = {
  DRAFT: { label: 'Draft', bgColor: '#F1F5F9', color: '#475569', borderColor: '#CBD5E1' },
  SENT: { label: 'Sent to Client', bgColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' },
  ACCEPTED: { label: 'Accepted / Won', bgColor: '#DCFCE7', color: '#15803D', borderColor: '#BBF7D0' },
  REJECTED: { label: 'Rejected', bgColor: '#FEE2E2', color: '#991B1B', borderColor: '#FCA5A5' },
  EXPIRED: { label: 'Expired', bgColor: '#FFF7ED', color: '#C2410C', borderColor: '#FFEDD5' },
  CANCELLED: { label: 'Cancelled', bgColor: '#F8FAFC', color: '#64748B', borderColor: '#E2E8F0' },
};
