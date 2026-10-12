import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

// If running against emulator
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

const app = initializeApp({ projectId: 'skati-erp-crm' });
const db = getFirestore(app);
const auth = getAuth(app);

const adminUser = 'admin@skati.com';
const standardUsers = [
  { email: 'admin@skati.com', password: 'Password123!', role: 'admin', displayName: 'System Admin' },
  { email: 'manager@skati.com', password: 'Password123!', role: 'manager', displayName: 'Plant Manager' },
  { email: 'production@skati.com', password: 'Password123!', role: 'production_employee', displayName: 'Production Operator' },
  { email: 'purchase@skati.com', password: 'Password123!', role: 'purchase_employee', displayName: 'Purchase Officer' },
  { email: 'sales@skati.com', password: 'Password123!', role: 'sales_employee', displayName: 'Sales Representative' },
];

async function seedCompleteTestSuite() {
  console.log('========================================================');
  console.log('🚀 SEEDING COMPLETE INDUSTRIAL MANUFACTURING TEST SUITE');
  console.log('========================================================\n');

  const now = Timestamp.now();

  // 1. AUTH & USERS
  console.log('1. Setting up 5 User Roles...');
  for (const u of standardUsers) {
    let uid;
    try {
      const userRec = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });
      uid = userRec.uid;
      console.log(`  ✓ Auth created: ${u.email} (UID: ${uid})`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const userRec = await auth.getUserByEmail(u.email);
        uid = userRec.uid;
        console.log(`  • Auth existing: ${u.email} (UID: ${uid})`);
      } else {
        console.warn(`  ! Auth notice for ${u.email}:`, err.message);
        continue;
      }
    }

    await db.collection('users').doc(uid).set({
      uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    }, { merge: true });
  }

  // 2. COUNTERS
  console.log('\n2. Initializing Counters...');
  const counters = [
    { id: 'rawMaterials', currentNumber: 5 },
    { id: 'products', currentNumber: 3 },
    { id: 'suppliers', currentNumber: 2 },
    { id: 'purchases', currentNumber: 1 },
    { id: 'productions', currentNumber: 1 },
    { id: 'leads', currentNumber: 2 },
    { id: 'customers', currentNumber: 2 },
    { id: 'requirements', currentNumber: 2 },
    { id: 'quotations', currentNumber: 1 },
    { id: 'orders', currentNumber: 1 },
    { id: 'dispatches', currentNumber: 1 },
    { id: 'payments', currentNumber: 1 },
  ];
  for (const c of counters) {
    await db.collection('counters').doc(c.id).set({ currentNumber: c.currentNumber }, { merge: true });
  }
  console.log('  ✓ 12 Counters initialized.');

  // 3. RAW MATERIALS & STOCK TRANSACTIONS
  console.log('\n3. Populating Raw Materials & Ledgers...');
  const materials = [
    {
      id: 'rm-001',
      materialCode: 'RM-0001',
      name: 'Stainless Steel 304 Mesh',
      category: 'Metal',
      description: 'Grade 304 wire mesh woven cloth 200 mesh',
      unit: 'meter',
      currentStock: 250,
      minimumStock: 50,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'rm-002',
      materialCode: 'RM-0002',
      name: 'Cellulose Filter Paper Media 10μm',
      category: 'Filter Media',
      description: 'High dust-holding industrial filter grade paper',
      unit: 'meter',
      currentStock: 500,
      minimumStock: 100,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'rm-003',
      materialCode: 'RM-0003',
      name: 'Nitrile Rubber O-Ring Gasket',
      category: 'Rubber',
      description: 'NBR heat & oil resistant sealing gasket (OD 120mm)',
      unit: 'piece',
      currentStock: 1200,
      minimumStock: 200,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'rm-004',
      materialCode: 'RM-0004',
      name: 'Aluminum End Cap Assembly',
      category: 'Metal',
      description: 'Precision stamped end cap with threaded center insert',
      unit: 'piece',
      currentStock: 800,
      minimumStock: 150,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'rm-005',
      materialCode: 'RM-0005',
      name: 'Perforated Inner Support Tube',
      category: 'Metal',
      description: 'Heavy duty SS 304 center core collapse protection tube',
      unit: 'piece',
      currentStock: 450,
      minimumStock: 80,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
  ];

  for (const m of materials) {
    await db.collection('rawMaterials').doc(m.id).set(m, { merge: true });
    const stxId = `stx-init-${m.id}`;
    await db.collection('stockTransactions').doc(stxId).set({
      id: stxId,
      rawMaterialId: m.id,
      rawMaterialNameSnapshot: m.name,
      type: 'INITIAL',
      quantity: m.currentStock,
      unit: m.unit,
      referenceType: 'INITIAL_SETUP',
      reason: 'Standard opening balance for test suite',
      createdAt: now,
      createdBy: adminUser,
    }, { merge: true });
  }
  console.log('  ✓ 5 Raw Materials & opening ledger entries created.');

  // 4. SUPPLIERS
  console.log('\n4. Populating Suppliers...');
  const suppliers = [
    {
      id: 'sup-001',
      supplierCode: 'SUP-0001',
      name: 'Apex Filtration Media Ltd',
      companyName: 'Apex Filtration Media Private Limited',
      phone: '+91 98250 11223',
      email: 'sales@apexfiltration.com',
      address: 'Plot 42, GIDC Industrial Estate',
      city: 'Ahmedabad',
      state: 'Gujarat',
      gstNumber: '24AAACA1234A1Z5',
      contactPerson: 'Rajesh Sharma',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'sup-002',
      supplierCode: 'SUP-0002',
      name: 'Zenith Precision Wire Mesh Co',
      companyName: 'Zenith Precision Mesh LLP',
      phone: '+91 98980 44556',
      email: 'orders@zenithmesh.com',
      address: 'Survey 108, Makarpura GIDC',
      city: 'Vadodara',
      state: 'Gujarat',
      gstNumber: '24BBBCB5678B2Z9',
      contactPerson: 'Kunal Patel',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
  ];
  for (const s of suppliers) {
    await db.collection('suppliers').doc(s.id).set(s, { merge: true });
  }
  console.log('  ✓ 2 Certified Suppliers created.');

  // 5. PURCHASES & PURCHASE ITEMS
  console.log('\n5. Populating Purchases & Receipts...');
  const purchaseId = 'pur-001';
  await db.collection('purchases').doc(purchaseId).set({
    id: purchaseId,
    purchaseCode: 'PO-0001',
    supplierId: 'sup-001',
    supplierCodeSnapshot: 'SUP-0001',
    supplierNameSnapshot: 'Apex Filtration Media Ltd',
    purchaseDate: now,
    invoiceNumber: 'INV-2026-1001',
    status: 'RECEIVED',
    subtotal: 50000,
    taxAmount: 9000,
    discountAmount: 0,
    grandTotal: 59000,
    notes: 'Initial material stock intake for manufacturing launch',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('purchaseItems').doc('pi-001').set({
    id: 'pi-001',
    purchaseId,
    rawMaterialId: 'rm-002',
    materialCodeSnapshot: 'RM-0002',
    materialNameSnapshot: 'Cellulose Filter Paper Media 10μm',
    unit: 'meter',
    quantity: 200,
    unitPrice: 250,
    lineSubtotal: 50000,
    taxRate: 18,
    taxAmount: 9000,
    lineTotal: 59000,
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 1 Purchase Order and line item created.');

  // 6. PRODUCTS, BOM & FG STOCK
  console.log('\n6. Populating Products, BOM & Finished Stock...');
  const products = [
    {
      id: 'prod-001',
      productCode: 'FG-0001',
      name: 'Hydraulic Oil Filter Cartridge HF-200',
      category: 'Oil Filter',
      description: 'High pressure return-line hydraulic filter cartridge (10 micron)',
      unit: 'piece',
      isActive: true,
      currentStock: 45,
    },
    {
      id: 'prod-002',
      productCode: 'FG-0002',
      name: 'Industrial Air Intake Filter AF-500',
      category: 'Air Filter',
      description: 'Heavy duty rotary screw compressor intake air filter element',
      unit: 'piece',
      isActive: true,
      currentStock: 30,
    },
    {
      id: 'prod-003',
      productCode: 'FG-0003',
      name: 'High Pressure Water Filter Cartridge PF-100',
      category: 'Water Filter',
      description: 'Pleated SS wire mesh process water filtration candle',
      unit: 'piece',
      isActive: true,
      currentStock: 20,
    },
  ];

  for (const p of products) {
    await db.collection('products').doc(p.id).set({
      id: p.id,
      productCode: p.productCode,
      name: p.name,
      category: p.category,
      description: p.description,
      unit: p.unit,
      isActive: p.isActive,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    }, { merge: true });

    await db.collection('finishedProductStock').doc(p.id).set({
      productId: p.id,
      productCodeSnapshot: p.productCode,
      productNameSnapshot: p.name,
      unit: p.unit,
      currentStock: p.currentStock,
      updatedAt: now,
    }, { merge: true });
  }

  const boms = [
    { id: 'bom-001', productId: 'prod-001', rawMaterialId: 'rm-001', materialCodeSnapshot: 'RM-0001', materialNameSnapshot: 'Stainless Steel 304 Mesh', unitSnapshot: 'meter', quantityPerProduct: 0.5 },
    { id: 'bom-002', productId: 'prod-001', rawMaterialId: 'rm-002', materialCodeSnapshot: 'RM-0002', materialNameSnapshot: 'Cellulose Filter Paper Media 10μm', unitSnapshot: 'meter', quantityPerProduct: 1.2 },
    { id: 'bom-003', productId: 'prod-001', rawMaterialId: 'rm-003', materialCodeSnapshot: 'RM-0003', materialNameSnapshot: 'Nitrile Rubber O-Ring Gasket', unitSnapshot: 'piece', quantityPerProduct: 2 },
    { id: 'bom-004', productId: 'prod-001', rawMaterialId: 'rm-004', materialCodeSnapshot: 'RM-0004', materialNameSnapshot: 'Aluminum End Cap Assembly', unitSnapshot: 'piece', quantityPerProduct: 2 },
    { id: 'bom-005', productId: 'prod-001', rawMaterialId: 'rm-005', materialCodeSnapshot: 'RM-0005', materialNameSnapshot: 'Perforated Inner Support Tube', unitSnapshot: 'piece', quantityPerProduct: 1 },
  ];
  for (const b of boms) {
    await db.collection('bomItems').doc(b.id).set({
      ...b,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    }, { merge: true });
  }
  console.log('  ✓ 3 Products, BOM formulas, and Finished Stock initialized.');

  // 7. PRODUCTIONS
  console.log('\n7. Populating Production Batches...');
  await db.collection('productions').doc('pr-001').set({
    id: 'pr-001',
    productionCode: 'PR-0001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    productUnitSnapshot: 'piece',
    productionArea: 'SECOND_FLOOR',
    quantityProduced: 25,
    status: 'COMPLETED',
    notes: 'Floor batch completed with 100% QA pass',
    startedAt: now,
    completedAt: now,
    createdAt: now,
    createdBy: adminUser,
    updatedAt: now,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('productionItems').doc('pri-001').set({
    id: 'pri-001',
    productionId: 'pr-001',
    rawMaterialId: 'rm-001',
    materialCodeSnapshot: 'RM-0001',
    materialNameSnapshot: 'Stainless Steel 304 Mesh',
    unit: 'meter',
    quantityPerProduct: 0.5,
    quantityConsumed: 12.5,
    createdAt: now,
  }, { merge: true });

  await db.collection('finishedProductTransactions').doc('fpt-001').set({
    id: 'fpt-001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    type: 'PRODUCTION_IN',
    quantity: 25,
    unit: 'piece',
    referenceType: 'PRODUCTION_BATCH',
    referenceId: 'pr-001',
    referenceCodeSnapshot: 'PR-0001',
    createdAt: now,
  }, { merge: true });
  console.log('  ✓ 1 Production Run, consumption log, and finished transaction created.');

  // 8. CRM LEADS & CUSTOMERS
  console.log('\n8. Populating CRM Pipeline & Customers...');
  await db.collection('leads').doc('lead-001').set({
    id: 'lead-001',
    leadCode: 'LED-0001',
    name: 'Prakash Verma',
    companyName: 'Apex Automotive Systems',
    phone: '+91 98790 23456',
    email: 'prakash@apexauto.in',
    source: 'WEBSITE',
    status: 'QUALIFIED',
    priority: 'HIGH',
    city: 'Pune',
    state: 'Maharashtra',
    industry: 'Automotive OEM',
    requirementSummary: 'Replacement hydraulic cartridges 100 units / month',
    assignedTo: adminUser,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('followUps').doc('fu-001').set({
    id: 'fu-001',
    leadId: 'lead-001',
    subject: 'Follow-up regarding technical specs',
    type: 'CALL',
    scheduledAt: now,
    status: 'COMPLETED',
    outcome: 'Client confirmed initial trial batch',
    notes: 'Approved trial of 20 units for main hydraulic loop',
    assignedTo: adminUser,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('customers').doc('cust-001').set({
    id: 'cust-001',
    customerCode: 'CUS-0001',
    name: 'Gujarat Petrochem Industries Ltd',
    companyName: 'Gujarat Petrochem Industries Limited',
    phone: '+91 94260 55443',
    email: 'procurement@gujpetrochem.com',
    address: 'Plot 789, Petrochem Complex',
    city: 'Dahej',
    state: 'Gujarat',
    gstNumber: '24CCCD9876C3Z1',
    industry: 'Petrochemicals & Refineries',
    contactPerson: 'Anil Desai',
    isActive: true,
    creditPeriodDays: 30,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('customerRequirements').doc('req-001').set({
    id: 'req-001',
    requirementCode: 'REQ-0001',
    customerId: 'cust-001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    title: 'Monthly filtration cartridges for refinery turbines',
    quantity: 20,
    unit: 'piece',
    targetPrice: 3200,
    status: 'OPEN',
    priority: 'HIGH',
    notes: 'Recurring monthly requirement for main turbine circuit',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 1 Lead, 1 Follow-up, 1 Customer, and 1 Requirement created.');

  // 9. QUOTATIONS, ORDERS, DISPATCHES & PAYMENTS
  console.log('\n9. Populating Quotations, Orders, Dispatches & Payments...');
  const quoteId = 'quo-001';
  await db.collection('quotations').doc(quoteId).set({
    id: quoteId,
    quotationCode: 'QUO-0001',
    customerId: 'cust-001',
    customerCodeSnapshot: 'CUS-0001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    quotationDate: now,
    validUntil: Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000),
    status: 'ACCEPTED',
    subtotal: 64000,
    taxRate: 18,
    taxAmount: 11520,
    discountAmount: 2000,
    grandTotal: 73520,
    terms: 'Payment 30 days from dispatch. Warranty 12 months against defects.',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('quotationItems').doc('qi-001').set({
    id: 'qi-001',
    quotationId: quoteId,
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    unit: 'piece',
    quantity: 20,
    unitPrice: 3200,
    lineSubtotal: 64000,
    discountAmount: 2000,
    taxRate: 18,
    taxAmount: 11520,
    lineTotal: 73520,
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });

  const orderId = 'ord-001';
  await db.collection('orders').doc(orderId).set({
    id: orderId,
    orderCode: 'ORD-0001',
    customerId: 'cust-001',
    customerCodeSnapshot: 'CUS-0001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    quotationId: quoteId,
    quotationCodeSnapshot: 'QUO-0001',
    orderDate: now,
    status: 'CONFIRMED',
    subtotal: 64000,
    taxAmount: 11520,
    discountAmount: 2000,
    grandTotal: 73520,
    paidAmount: 25000,
    pendingAmount: 48520,
    notes: 'Order confirmed with advance token payment',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('orderItems').doc('oi-001').set({
    id: 'oi-001',
    orderId,
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    unit: 'piece',
    orderedQuantity: 20,
    dispatchedQuantity: 10,
    unitPrice: 3200,
    lineSubtotal: 64000,
    discountAmount: 2000,
    taxRate: 18,
    taxAmount: 11520,
    lineTotal: 73520,
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });

  await db.collection('productionOrderLinks').doc('pol-001').set({
    id: 'pol-001',
    orderId,
    orderCodeSnapshot: 'ORD-0001',
    productId: 'prod-001',
    productionId: 'pr-001',
    allocatedQuantity: 20,
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });

  const dispatchId = 'dsp-001';
  await db.collection('dispatches').doc(dispatchId).set({
    id: dispatchId,
    dispatchCode: 'DSP-0001',
    orderId,
    orderCodeSnapshot: 'ORD-0001',
    customerId: 'cust-001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    dispatchDate: now,
    status: 'DELIVERED',
    transporterName: 'V-Trans Logistics',
    trackingNumber: 'TRK-99001',
    notes: 'Dispatched 10 units via surface logistics',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('dispatchItems').doc('dspi-001').set({
    id: 'dspi-001',
    dispatchId,
    orderId,
    orderItemId: 'oi-001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    quantity: 10,
    unit: 'piece',
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });

  await db.collection('payments').doc('pay-001').set({
    id: 'pay-001',
    paymentCode: 'PAY-0001',
    orderId,
    orderCodeSnapshot: 'ORD-0001',
    customerId: 'cust-001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    amount: 25000,
    paymentMethod: 'BANK_TRANSFER',
    status: 'RECEIVED',
    paymentDate: now,
    referenceNumber: 'NEFT-AXIS-998822',
    notes: 'Advance 35% deposit against order ORD-0001',
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 1 Quotation, 1 Order, 1 Dispatch, and 1 Payment ledger created.');

  console.log('\n========================================================');
  console.log('🎉 ALL 25 TESTING DATASETS SEEDED SUCCESSFULLY!');
  console.log('========================================================\n');
}

seedCompleteTestSuite().catch(console.error);
