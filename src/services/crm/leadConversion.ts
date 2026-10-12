import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore.ts';
import type { Customer, Lead } from './crmTypes.ts';

const LEADS_COLLECTION = 'leads';
const CUSTOMERS_COLLECTION = 'customers';
const COUNTERS_COLLECTION = 'counters';
const CUSTOMER_COUNTER_ID = 'customers';

export interface ConvertLeadInput {
  leadId: string;
  gstNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  contactPerson?: string;
  notes?: string;
}

/**
 * Atomically converts a qualified Lead into a verified Customer in ONE transaction:
 * - Validates lead exists and is not already converted
 * - Atomically increments customer counter (CUS-000001)
 * - Creates customer record with sourceLeadId = leadId
 * - Updates lead status to 'CONVERTED' and links convertedCustomerId
 * - 100% rollback guarantee on any conflict or concurrent conversion attempt
 */
export async function convertLeadToCustomer(
  input: ConvertLeadInput,
  userIdentifier: string
): Promise<{ customer: Customer; lead: Lead }> {
  const leadId = input.leadId?.trim();
  if (!leadId) {
    throw new Error('Lead ID is required for conversion.');
  }

  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  const customerRef = doc(collection(db, CUSTOMERS_COLLECTION));
  const counterRef = doc(db, COUNTERS_COLLECTION, CUSTOMER_COUNTER_ID);

  return runTransaction(db, async (transaction) => {
    // 1. READ & VALIDATE LEAD
    const leadSnap = await transaction.get(leadRef);
    if (!leadSnap.exists()) {
      throw new Error(`Lead with ID "${leadId}" does not exist.`);
    }

    const leadData = leadSnap.data() as Lead;
    if (leadData.convertedCustomerId || leadData.status === 'CONVERTED') {
      throw new Error(
        `Lead "${leadData.name}" (${leadData.leadCode}) has already been converted to a customer.`
      );
    }

    // 2. READ & INCREMENT CUSTOMER COUNTER
    const counterDoc = await transaction.get(counterRef);
    let nextCount = 1;
    if (counterDoc.exists()) {
      nextCount = (counterDoc.data().currentNumber || 0) + 1;
    }
    const customerCode = `CUS-${String(nextCount).padStart(6, '0')}`;

    // 3. PREPARE CUSTOMER DOCUMENT
    const customerData = {
      customerCode,
      name: leadData.name,
      companyName: leadData.companyName || '',
      phone: leadData.phone,
      email: leadData.email || '',
      billingAddress: input.billingAddress?.trim() || leadData.city || '',
      shippingAddress: input.shippingAddress?.trim() || leadData.city || '',
      city: leadData.city || '',
      state: leadData.state || '',
      gstNumber: input.gstNumber?.trim().toUpperCase() || '',
      contactPerson: input.contactPerson?.trim() || leadData.name,
      notes: input.notes?.trim() || leadData.notes || '',
      sourceLeadId: leadId,
      assignedTo: leadData.assignedTo,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userIdentifier,
      updatedBy: userIdentifier,
    };

    // 4. WRITE CUSTOMER & COUNTER
    transaction.set(counterRef, { currentNumber: nextCount }, { merge: true });
    transaction.set(customerRef, customerData);

    // 5. UPDATE LEAD RECORD
    transaction.update(leadRef, {
      convertedCustomerId: customerRef.id,
      status: 'CONVERTED',
      updatedAt: serverTimestamp(),
      updatedBy: userIdentifier,
    });

    const createdCustomer: Customer = {
      id: customerRef.id,
      ...customerData,
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
    };

    const updatedLead: Lead = {
      ...leadData,
      convertedCustomerId: customerRef.id,
      status: 'CONVERTED',
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as Timestamp,
      updatedBy: userIdentifier,
    };

    return { customer: createdCustomer, lead: updatedLead };
  });
}
