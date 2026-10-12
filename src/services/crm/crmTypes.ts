import type { Timestamp } from 'firebase/firestore';

// ==========================================
// 1. LEAD DOMAIN TYPES
// ==========================================

export type LeadSource =
  | 'WEBSITE'
  | 'PHONE'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'REFERENCE'
  | 'WALK_IN'
  | 'SOCIAL_MEDIA'
  | 'OTHER';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'QUOTATION'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'CONVERTED';

export type CrmPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string;
  leadCode: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: CrmPriority;
  city?: string;
  state?: string;
  industry?: string;
  requirementSummary?: string;
  assignedTo: string;
  notes?: string;
  nextFollowUpAt?: Timestamp;
  lastContactedAt?: Timestamp;
  convertedCustomerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface CreateLeadInput {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status?: LeadStatus;
  priority: CrmPriority;
  city?: string;
  state?: string;
  industry?: string;
  requirementSummary?: string;
  assignedTo: string;
  notes?: string;
  nextFollowUpAt?: Date;
}

export interface UpdateLeadInput {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  source?: LeadSource;
  status?: LeadStatus;
  priority?: CrmPriority;
  city?: string;
  state?: string;
  industry?: string;
  requirementSummary?: string;
  assignedTo?: string;
  notes?: string;
  nextFollowUpAt?: Date | null;
  lastContactedAt?: Date;
}

export interface LeadFilterOptions {
  status?: LeadStatus | 'ALL';
  priority?: CrmPriority | 'ALL';
  assignedTo?: string | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

// ==========================================
// 2. FOLLOW-UP DOMAIN TYPES
// ==========================================

export type FollowUpType =
  | 'CALL'
  | 'MEETING'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'VISIT'
  | 'OTHER';

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface FollowUp {
  id: string;
  leadId: string;
  leadCodeSnapshot: string;
  type: FollowUpType;
  subject: string;
  notes: string;
  followUpAt: Timestamp;
  completedAt?: Timestamp;
  status: FollowUpStatus;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface CreateFollowUpInput {
  leadId: string;
  type: FollowUpType;
  subject: string;
  notes: string;
  followUpAt: Date;
  status?: FollowUpStatus;
}

export interface UpdateFollowUpInput {
  type?: FollowUpType;
  subject?: string;
  notes?: string;
  followUpAt?: Date;
  status?: FollowUpStatus;
}

// ==========================================
// 3. CUSTOMER DOMAIN TYPES
// ==========================================

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  sourceLeadId?: string;
  assignedTo: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface CreateCustomerInput {
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  sourceLeadId?: string;
  assignedTo: string;
  isActive?: boolean;
}

export interface UpdateCustomerInput {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  contactPerson?: string;
  notes?: string;
  assignedTo?: string;
  isActive?: boolean;
}

export interface CustomerFilterOptions {
  activeStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  assignedTo?: string | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

// ==========================================
// 4. CUSTOMER REQUIREMENT DOMAIN TYPES
// ==========================================

export type RequirementStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'QUOTED'
  | 'WON'
  | 'LOST'
  | 'CANCELLED';

export interface CustomerRequirement {
  id: string;
  requirementCode: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  title: string;
  description: string;
  productId?: string;
  productCodeSnapshot?: string;
  productNameSnapshot?: string;
  quantity?: number;
  unit?: string;
  expectedDate?: Timestamp;
  status: RequirementStatus;
  priority: CrmPriority;
  assignedTo: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface CreateRequirementInput {
  customerId: string;
  title: string;
  description: string;
  productId?: string;
  quantity?: number;
  unit?: string;
  expectedDate?: Date;
  status?: RequirementStatus;
  priority: CrmPriority;
  assignedTo: string;
  notes?: string;
}

export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  productId?: string;
  quantity?: number;
  unit?: string;
  expectedDate?: Date | null;
  status?: RequirementStatus;
  priority?: CrmPriority;
  assignedTo?: string;
  notes?: string;
}

export interface RequirementFilterOptions {
  customerId?: string | 'ALL';
  status?: RequirementStatus | 'ALL';
  priority?: CrmPriority | 'ALL';
  assignedTo?: string | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

// ==========================================
// 5. QUOTATION DOMAIN TYPES
// ==========================================

export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface Quotation {
  id: string;
  quotationCode: string;
  customerId: string;
  customerCodeSnapshot: string;
  customerNameSnapshot: string;
  requirementId?: string;
  quotationDate: Timestamp;
  validUntil?: Timestamp;
  status: QuotationStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  acceptedOrderId?: string;
  acceptedOrderCodeSnapshot?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId?: string;
  productCodeSnapshot?: string;
  productNameSnapshot: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineSubtotal: number;
  lineTotal: number;
  createdAt: Timestamp;
  createdBy: string;
}

export interface CreateQuotationItemInput {
  productId?: string;
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate?: number;
}

export interface CreateQuotationInput {
  customerId: string;
  requirementId?: string;
  quotationDate?: Date;
  validUntil?: Date;
  discountAmount?: number;
  notes?: string;
  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  validUntil?: Date | null;
  discountAmount?: number;
  notes?: string;
  status?: QuotationStatus;
  items?: CreateQuotationItemInput[];
}

export interface QuotationFilterOptions {
  customerId?: string | 'ALL';
  status?: QuotationStatus | 'ALL';
  searchQuery?: string;
  pageSize?: number;
}

export interface QuotationDetailsResult {
  quotation: Quotation;
  items: QuotationItem[];
}
