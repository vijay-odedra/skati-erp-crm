import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

// Notice: connecting specifically to the 'default' named database in this GCP project
const db = getFirestore(app, 'default');

async function provisionAllTables() {
  console.log(`Starting full provisioning on project: ${serviceAccount.project_id} (database: default)...\n`);

  const now = Timestamp.now();
  const adminUser = 'admin@skati.com';

  // 1. COUNTERS
  console.log('1. Provisioning "counters"...');
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
    { id: 'dispatches', currentNumber: 0 },
    { id: 'payments', currentNumber: 0 },
  ];
  for (const c of counters) {
    await db.collection('counters').doc(c.id).set({ currentNumber: c.currentNumber }, { merge: true });
  }
  console.log('  ✓ 12 counters initialized.');

  // 2. USERS
  console.log('2. Provisioning "users"...');
  const users = [
    {
      uid: 'user-admin-skati',
      email: 'admin@skati.com',
      displayName: 'System Admin',
      role: 'admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user-manager-skati',
      email: 'manager@skati.com',
      displayName: 'Plant Manager',
      role: 'manager',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user-prod-skati',
      email: 'production@skati.com',
      displayName: 'Production Operator',
      role: 'production_employee',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user-purch-skati',
      email: 'purchase@skati.com',
      displayName: 'Purchase Officer',
      role: 'purchase_employee',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
    {
      uid: 'user-sales-skati',
      email: 'sales@skati.com',
      displayName: 'Sales Representative',
      role: 'sales_employee',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
  ];
  for (const u of users) {
    await db.collection('users').doc(u.uid).set(u, { merge: true });
  }
  console.log('  ✓ 5 standard user profiles created in "users" collection.');

  // 3. RAW MATERIALS & STOCK TRANSACTIONS
  console.log('3. Provisioning "rawMaterials" and "stockTransactions"...');
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

    // Initial stock ledger entry
    const txId = `stx-init-${m.id}`;
    await db.collection('stockTransactions').doc(txId).set({
      id: txId,
      rawMaterialId: m.id,
      rawMaterialNameSnapshot: m.name,
      type: 'INITIAL',
      quantity: m.currentStock,
      unit: m.unit,
      referenceType: 'INITIAL_SETUP',
      reason: 'Live database initialization opening balance',
      createdAt: now,
      createdBy: adminUser,
    }, { merge: true });
  }
  console.log('  ✓ 5 raw materials and initial stock transactions created.');

  // 4. SUPPLIERS
  console.log('4. Provisioning "suppliers"...');
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
  console.log('  ✓ 2 suppliers created.');

  // 5. PURCHASES & PURCHASE ITEMS
  console.log('5. Provisioning "purchases" and "purchaseItems"...');
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
    notes: 'Initial inventory intake for manufacturing launch',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  const purchaseItemId = 'pi-001';
  await db.collection('purchaseItems').doc(purchaseItemId).set({
    id: purchaseItemId,
    purchaseId: purchaseId,
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
  console.log('  ✓ 1 purchase record and item created.');

  // 6. PRODUCTS & BOM ITEMS & FINISHED PRODUCT STOCK
  console.log('6. Provisioning "products", "bomItems", and "finishedProductStock"...');
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
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
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
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
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
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
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
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdBy: p.createdBy,
      updatedBy: p.updatedBy,
    }, { merge: true });

    // Finished Product Stock document (ID matches productId)
    await db.collection('finishedProductStock').doc(p.id).set({
      productId: p.id,
      productCodeSnapshot: p.productCode,
      productNameSnapshot: p.name,
      unit: p.unit,
      currentStock: p.currentStock,
      updatedAt: now,
    }, { merge: true });
  }

  // BOM items for FG-0001 (Hydraulic Filter)
  const boms = [
    {
      id: 'bom-001',
      productId: 'prod-001',
      rawMaterialId: 'rm-001',
      materialCodeSnapshot: 'RM-0001',
      materialNameSnapshot: 'Stainless Steel 304 Mesh',
      unitSnapshot: 'meter',
      quantityPerProduct: 0.5,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'bom-002',
      productId: 'prod-001',
      rawMaterialId: 'rm-002',
      materialCodeSnapshot: 'RM-0002',
      materialNameSnapshot: 'Cellulose Filter Paper Media 10μm',
      unitSnapshot: 'meter',
      quantityPerProduct: 1.2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'bom-003',
      productId: 'prod-001',
      rawMaterialId: 'rm-003',
      materialCodeSnapshot: 'RM-0003',
      materialNameSnapshot: 'Nitrile Rubber O-Ring Gasket',
      unitSnapshot: 'piece',
      quantityPerProduct: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'bom-004',
      productId: 'prod-001',
      rawMaterialId: 'rm-004',
      materialCodeSnapshot: 'RM-0004',
      materialNameSnapshot: 'Aluminum End Cap Assembly',
      unitSnapshot: 'piece',
      quantityPerProduct: 2,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
    {
      id: 'bom-005',
      productId: 'prod-001',
      rawMaterialId: 'rm-005',
      materialCodeSnapshot: 'RM-0005',
      materialNameSnapshot: 'Perforated Inner Support Tube',
      unitSnapshot: 'piece',
      quantityPerProduct: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
  ];
  for (const b of boms) {
    await db.collection('bomItems').doc(b.id).set(b, { merge: true });
  }
  console.log('  ✓ 3 products, finished product stock, and 5 BOM items created.');

  // 7. PRODUCTIONS, PRODUCTION ITEMS & FINISHED PRODUCT TRANSACTIONS
  console.log('7. Provisioning "productions", "productionItems", and "finishedProductTransactions"...');
  const prodBatchId = 'pr-001';
  await db.collection('productions').doc(prodBatchId).set({
    id: prodBatchId,
    productionCode: 'PR-0001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    productUnitSnapshot: 'piece',
    productionArea: 'SECOND_FLOOR',
    quantityProduced: 25,
    status: 'COMPLETED',
    notes: 'Initial production batch run',
    startedAt: now,
    completedAt: now,
    createdAt: now,
    createdBy: adminUser,
    updatedAt: now,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('productionItems').doc('pri-001').set({
    id: 'pri-001',
    productionId: prodBatchId,
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
    referenceId: prodBatchId,
    referenceCodeSnapshot: 'PR-0001',
    createdAt: now,
  }, { merge: true });
  console.log('  ✓ 1 production batch, consumption entry, and finished transaction created.');

  // 8. CRM: LEADS & FOLLOW-UPS
  console.log('8. Provisioning "leads" and "followUps"...');
  const leads = [
    {
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
    },
    {
      id: 'lead-002',
      leadCode: 'LED-0002',
      name: 'Sunil Mehta',
      companyName: 'Western Engineering Works',
      phone: '+91 98240 78901',
      email: 'smehta@westernengg.com',
      source: 'REFERENCE',
      status: 'NEW',
      priority: 'MEDIUM',
      city: 'Surat',
      state: 'Gujarat',
      industry: 'Heavy Machinery',
      requirementSummary: 'Compressor air intake filtration elements',
      assignedTo: adminUser,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
  ];
  for (const l of leads) {
    await db.collection('leads').doc(l.id).set(l, { merge: true });
  }

  await db.collection('followUps').doc('fu-001').set({
    id: 'fu-001',
    leadId: 'lead-001',
    interactionType: 'CALL',
    scheduledAt: now,
    status: 'COMPLETED',
    outcome: 'Client interested in sample trial for 5 units',
    notes: 'Followed up regarding technical drawings and specifications',
    assignedTo: adminUser,
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 2 leads and 1 follow-up logged.');

  // 9. CUSTOMERS & CUSTOMER REQUIREMENTS
  console.log('9. Provisioning "customers" and "customerRequirements"...');
  const customers = [
    {
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
    },
    {
      id: 'cust-002',
      customerCode: 'CUS-0002',
      name: 'Precision Hydraulics Corporation',
      companyName: 'Precision Hydraulics Corp',
      phone: '+91 98251 33221',
      email: 'purchase@precisionhydraulics.in',
      address: 'Industrial Area Phase 2',
      city: 'Rajkot',
      state: 'Gujarat',
      gstNumber: '24DDDE4321D4Z8',
      industry: 'Hydraulics & Fluid Power',
      contactPerson: 'Bhavin Vora',
      isActive: true,
      creditPeriodDays: 45,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser,
      updatedBy: adminUser,
    },
  ];
  for (const c of customers) {
    await db.collection('customers').doc(c.id).set(c, { merge: true });
  }

  await db.collection('customerRequirements').doc('req-001').set({
    id: 'req-001',
    requirementCode: 'REQ-0001',
    customerId: 'cust-001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    quantity: 20,
    unit: 'piece',
    targetPrice: 3200,
    status: 'ACTIVE',
    notes: 'Recurring monthly requirement for main turbine circuit',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 2 customers and 1 requirement created.');

  // 10. QUOTATIONS & QUOTATION ITEMS
  console.log('10. Provisioning "quotations" and "quotationItems"...');
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
  console.log('  ✓ 1 quotation and item created.');

  // 11. ORDERS & ORDER ITEMS & PRODUCTION ORDER LINKS
  console.log('11. Provisioning "orders", "orderItems", and "productionOrderLinks"...');
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
    notes: 'PO# GPI-2026/889 received and confirmed',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('orderItems').doc('oi-001').set({
    id: 'oi-001',
    orderId: orderId,
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    unit: 'piece',
    quantity: 20,
    unitPrice: 3200,
    dispatchedQuantity: 0,
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
    orderId: orderId,
    orderCodeSnapshot: 'ORD-0001',
    productId: 'prod-001',
    productionId: prodBatchId,
    allocatedQuantity: 20,
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });
  console.log('  ✓ 1 order, order item, and production link created.');

  // 12. DISPATCHES, DISPATCH ITEMS & PAYMENTS
  console.log('12. Provisioning "dispatches", "dispatchItems", and "payments"...');
  const paymentId = 'pay-001';
  await db.collection('payments').doc(paymentId).set({
    id: paymentId,
    paymentCode: 'PAY-0001',
    orderId: orderId,
    orderCodeSnapshot: 'ORD-0001',
    customerId: 'cust-001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    amount: 25000,
    paymentMethod: 'BANK_TRANSFER',
    paymentStatus: 'RECEIVED',
    paymentDate: now,
    referenceNumber: 'NEFT-AXIS-998822',
    notes: 'Advance 35% deposit against order ORD-0001',
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });

  // Placeholders for dispatches & dispatchItems so the collection is registered and active
  const dispatchId = 'dsp-init';
  await db.collection('dispatches').doc(dispatchId).set({
    id: dispatchId,
    dispatchCode: 'DSP-0000',
    orderId: orderId,
    orderCodeSnapshot: 'ORD-0001',
    customerId: 'cust-001',
    customerNameSnapshot: 'Gujarat Petrochem Industries Ltd',
    dispatchDate: now,
    status: 'DRAFT',
    transporterName: 'V-Trans Logistics',
    trackingNumber: 'TRK-99001',
    notes: 'Ready for shipment dispatch staging',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUser,
    updatedBy: adminUser,
  }, { merge: true });

  await db.collection('dispatchItems').doc('dspi-init').set({
    id: 'dspi-init',
    dispatchId: dispatchId,
    orderItemId: 'oi-001',
    productId: 'prod-001',
    productCodeSnapshot: 'FG-0001',
    productNameSnapshot: 'Hydraulic Oil Filter Cartridge HF-200',
    quantity: 10,
    unit: 'piece',
    createdAt: now,
    createdBy: adminUser,
  }, { merge: true });
  console.log('  ✓ Payment and Dispatch tables initialized.');

  console.log('\n======================================================');
  console.log('🎉 ALL 25 FIRESTORE TABLES PROVISIONED & FULLY CONNECTED!');
  console.log('======================================================\n');
}

provisionAllTables().catch(console.error);
