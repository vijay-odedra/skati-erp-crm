import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  type DocumentSnapshot,
  type QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilterOptions,
} from './crmTypes.ts';

const LEADS_COLLECTION = 'leads';
const COUNTERS_COLLECTION = 'counters';
const LEAD_COUNTER_ID = 'leads';

export interface FetchLeadsResult {
  items: Lead[];
  lastDoc: DocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Creates a new Lead with atomic sequential code generation (LEAD-000001).
 */
export async function createLead(
  input: CreateLeadInput,
  userIdentifier: string
): Promise<Lead> {
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Lead contact name is required.');
  }

  const phone = input.phone?.trim();
  if (!phone) {
    throw new Error('Phone number is required.');
  }

  if (input.email?.trim()) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(input.email.trim())) {
      throw new Error('Invalid email address format.');
    }
  }

  if (!input.assignedTo?.trim()) {
    throw new Error('Assigned sales representative is required.');
  }

  const newLeadRef = doc(collection(db, LEADS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, LEAD_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const leadCode = `LEAD-${String(nextCount).padStart(6, '0')}`;
    const nextFollowUpTimestamp = input.nextFollowUpAt ? Timestamp.fromDate(input.nextFollowUpAt) : null;

    const leadData = {
      leadCode,
      name,
      companyName: input.companyName?.trim() || '',
      phone,
      email: input.email?.trim() || '',
      source: input.source,
      status: input.status || 'NEW',
      priority: input.priority || 'MEDIUM',
      city: input.city?.trim() || '',
      state: input.state?.trim() || '',
      industry: input.industry?.trim() || '',
      requirementSummary: input.requirementSummary?.trim() || '',
      assignedTo: input.assignedTo.trim(),
      notes: input.notes?.trim() || '',
      nextFollowUpAt: nextFollowUpTimestamp,
      lastContactedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(newLeadRef, leadData);

    return {
      id: newLeadRef.id,
      ...leadData,
      nextFollowUpAt: nextFollowUpTimestamp || undefined,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as Lead;
  });
}

/**
 * Updates an existing lead with immutable leadCode and creator protections.
 */
export async function updateLead(
  id: string,
  input: UpdateLeadInput,
  userIdentifier: string
): Promise<void> {
  const leadRef = doc(db, LEADS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const leadSnap = await transaction.get(leadRef);
    if (!leadSnap.exists()) {
      throw new Error('Lead not found.');
    }

    const currentLead = leadSnap.data() as Lead;
    if (currentLead.status === 'CONVERTED' && input.status && input.status !== 'CONVERTED') {
      throw new Error('Converted leads cannot have their status reverted.');
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error('Lead contact name cannot be empty.');
      updates.name = name;
    }

    if (input.phone !== undefined) {
      const phone = input.phone.trim();
      if (!phone) throw new Error('Phone number cannot be empty.');
      updates.phone = phone;
    }

    if (input.email !== undefined && input.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(input.email.trim())) {
        throw new Error('Invalid email address format.');
      }
      updates.email = input.email.trim();
    } else if (input.email !== undefined) {
      updates.email = '';
    }

    if (input.companyName !== undefined) updates.companyName = input.companyName.trim();
    if (input.source !== undefined) updates.source = input.source;
    if (input.status !== undefined) updates.status = input.status;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.city !== undefined) updates.city = input.city.trim();
    if (input.state !== undefined) updates.state = input.state.trim();
    if (input.industry !== undefined) updates.industry = input.industry.trim();
    if (input.requirementSummary !== undefined) updates.requirementSummary = input.requirementSummary.trim();
    if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim();

    if (input.nextFollowUpAt !== undefined) {
      updates.nextFollowUpAt = input.nextFollowUpAt ? Timestamp.fromDate(input.nextFollowUpAt) : null;
    }

    if (input.lastContactedAt !== undefined) {
      updates.lastContactedAt = Timestamp.fromDate(input.lastContactedAt);
    }

    transaction.update(leadRef, updates);
  });
}

/**
 * Fetches a single lead by ID.
 */
export async function getLead(id: string): Promise<Lead | null> {
  const docRef = doc(db, LEADS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Lead;
}

/**
 * Queries paginated leads with cursor pagination and search.
 */
export async function getLeads(
  options: LeadFilterOptions = {},
  lastDocSnapshot?: DocumentSnapshot | null
): Promise<FetchLeadsResult> {
  const pageSize = options.pageSize || 20;
  const constraints: QueryConstraint[] = [];

  if (options.status && options.status !== 'ALL') {
    constraints.push(where('status', '==', options.status));
  }

  if (options.priority && options.priority !== 'ALL') {
    constraints.push(where('priority', '==', options.priority));
  }

  if (options.assignedTo && options.assignedTo !== 'ALL') {
    constraints.push(where('assignedTo', '==', options.assignedTo));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize + 1));

  if (lastDocSnapshot) {
    constraints.push(startAfter(lastDocSnapshot));
  }

  const q = query(collection(db, LEADS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);

  let rawDocs = querySnapshot.docs;
  const hasMore = rawDocs.length > pageSize;
  if (hasMore) {
    rawDocs = rawDocs.slice(0, pageSize);
  }

  let items: Lead[] = rawDocs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Lead[];

  // In-page search by name, code, company, phone, or city
  if (options.searchQuery?.trim()) {
    const queryLower = options.searchQuery.trim().toLowerCase();
    items = items.filter(
      (l) =>
        l.leadCode.toLowerCase().includes(queryLower) ||
        l.name.toLowerCase().includes(queryLower) ||
        (l.companyName && l.companyName.toLowerCase().includes(queryLower)) ||
        l.phone.includes(queryLower) ||
        (l.city && l.city.toLowerCase().includes(queryLower))
    );
  }

  const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;

  return {
    items,
    lastDoc,
    hasMore,
  };
}
