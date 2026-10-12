import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type {
  FollowUp,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  Lead,
} from './crmTypes.ts';

const FOLLOW_UPS_COLLECTION = 'followUps';
const LEADS_COLLECTION = 'leads';

/**
 * Creates a new Follow-up record linked to a verified lead.
 */
export async function createFollowUp(
  input: CreateFollowUpInput,
  userIdentifier: string
): Promise<FollowUp> {
  const leadId = input.leadId?.trim();
  if (!leadId) {
    throw new Error('Lead ID is required.');
  }

  const subject = input.subject?.trim();
  if (!subject) {
    throw new Error('Follow-up subject/title is required.');
  }

  if (!input.followUpAt) {
    throw new Error('Follow-up scheduled date & time is required.');
  }

  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  const newFollowUpRef = doc(collection(db, FOLLOW_UPS_COLLECTION));
  const followUpTimestamp = Timestamp.fromDate(input.followUpAt);

  return runTransaction(db, async (transaction) => {
    const leadSnap = await transaction.get(leadRef);
    if (!leadSnap.exists()) {
      throw new Error(`Lead with ID "${leadId}" does not exist.`);
    }

    const leadData = leadSnap.data() as Lead;
    const followUpData = {
      leadId,
      leadCodeSnapshot: leadData.leadCode,
      type: input.type,
      subject,
      notes: input.notes?.trim() || '',
      followUpAt: followUpTimestamp,
      completedAt: input.status === 'COMPLETED' ? serverTimestamp() : null,
      status: input.status || 'PENDING',
      createdAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    // Also update lead's nextFollowUpAt & lastContactedAt
    transaction.update(leadRef, {
      nextFollowUpAt: followUpTimestamp,
      lastContactedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    transaction.set(newFollowUpRef, followUpData);

    return {
      id: newFollowUpRef.id,
      ...followUpData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    } as FollowUp;
  });
}

/**
 * Updates an existing follow-up record (e.g. mark as completed).
 */
export async function updateFollowUp(
  id: string,
  input: UpdateFollowUpInput,
  userIdentifier: string
): Promise<void> {
  const followUpRef = doc(db, FOLLOW_UPS_COLLECTION, id);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(followUpRef);
    if (!snap.exists()) {
      throw new Error('Follow-up record not found.');
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    };

    if (input.type !== undefined) updates.type = input.type;
    if (input.subject !== undefined) updates.subject = input.subject.trim();
    if (input.notes !== undefined) updates.notes = input.notes.trim();
    if (input.followUpAt !== undefined) updates.followUpAt = Timestamp.fromDate(input.followUpAt);

    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === 'COMPLETED') {
        updates.completedAt = serverTimestamp();
      }
    }

    transaction.update(followUpRef, updates);
  });
}

/**
 * Fetches all follow-up history for a specific lead ordered by followUpAt.
 */
export async function getFollowUpsByLead(
  leadId: string,
  limitCount = 50
): Promise<FollowUp[]> {
  const q = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('leadId', '==', leadId),
    orderBy('followUpAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as FollowUp[];
}

/**
 * Fetches pending follow-ups for a sales representative.
 */
export async function getPendingFollowUps(limitCount = 20): Promise<FollowUp[]> {
  const q = query(
    collection(db, FOLLOW_UPS_COLLECTION),
    where('status', '==', 'PENDING'),
    orderBy('followUpAt', 'asc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as FollowUp[];
}
