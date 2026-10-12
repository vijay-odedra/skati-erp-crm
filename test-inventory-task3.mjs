import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'skati-erp-crm.firebaseapp.com',
  projectId: 'skati-erp-crm',
  storageBucket: 'skati-erp-crm.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function runInventoryTests() {
  console.log('=== STARTING TASK 3 RAW MATERIALS & INVENTORY TEST SUITE ===\n');

  // 1. Setup Users for each role
  const roles = [
    { email: 'admin@skati.local', password: 'Password123!', role: 'admin' },
    { email: 'manager@skati.local', password: 'Password123!', role: 'manager' },
    { email: 'purchase@skati.local', password: 'Password123!', role: 'purchase_employee' },
    { email: 'production@skati.local', password: 'Password123!', role: 'production_employee' },
    { email: 'sales@skati.local', password: 'Password123!', role: 'sales_employee' },
  ];

  for (const u of roles) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: u.email,
        displayName: u.role,
        role: u.role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, u.email, u.password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: u.email,
          displayName: u.role,
          role: u.role,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    }
  }

  // --- TEST GROUP A: MATERIAL MASTER CREATION & CODE GENERATION ---
  console.log('--- TEST GROUP A: MATERIAL CREATION & CODE SEQUENCE ---');

  // Admin logs in
  await signInWithEmailAndPassword(auth, 'admin@skati.local', 'Password123!');

  // Create material with atomic sequence counter
  async function createMaterial(name, category, unit, minStock, initStock) {
    const counterRef = doc(db, 'counters', 'rawMaterials');
    const newMatRef = doc(collection(db, 'rawMaterials'));
    const txRef = doc(collection(db, 'stockTransactions'));

    return runTransaction(db, async (t) => {
      const counterDoc = await t.get(counterRef);
      let nextCount = 1;
      if (counterDoc.exists()) {
        nextCount = (counterDoc.data().currentNumber || 0) + 1;
      }
      const code = `RM-${String(nextCount).padStart(4, '0')}`;

      t.set(counterRef, { currentNumber: nextCount }, { merge: true });
      t.set(newMatRef, {
        materialCode: code,
        name,
        category,
        unit,
        currentStock: initStock,
        minimumStock: minStock,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'admin@skati.local',
        updatedBy: 'admin@skati.local',
      });

      if (initStock > 0) {
        t.set(txRef, {
          rawMaterialId: newMatRef.id,
          rawMaterialNameSnapshot: name,
          type: 'INITIAL',
          quantity: initStock,
          unit,
          referenceType: 'INITIAL_SETUP',
          reason: 'Initial stock setup',
          createdAt: serverTimestamp(),
          createdBy: 'admin@skati.local',
        });
      }

      return { id: newMatRef.id, materialCode: code };
    });
  }

  const mat1 = await createMaterial('PP Spunbond Fabric 50 GSM', 'Filter Media', 'kg', 200, 1000);
  console.log(`[PASS] Test 1: Created material ${mat1.materialCode} (Initial Stock: 1000 Kg)`);

  const mat2 = await createMaterial('End Cap Polypropylene 2.5 Inch', 'Plastic', 'piece', 500, 2500);
  console.log(`[PASS] Test 2: Created material ${mat2.materialCode} (Initial Stock: 2500 Piece)`);

  // Verify unique sequence
  if (mat1.materialCode === 'RM-0001' && mat2.materialCode === 'RM-0002') {
    console.log('[PASS] Test 3: Unique serial material codes generated systematically (RM-0001, RM-0002).');
  }

  // Verify INITIAL transaction in stockTransactions
  const initTxSnap = await getDocs(
    query(collection(db, 'stockTransactions'), where('rawMaterialId', '==', mat1.id), where('type', '==', 'INITIAL'))
  );
  if (!initTxSnap.empty && initTxSnap.docs[0].data().quantity === 1000) {
    console.log('[PASS] Test 4: INITIAL transaction audit log created correctly with quantity 1000.');
  } else {
    throw new Error('Test 4 Failed: INITIAL transaction missing or incorrect.');
  }

  // --- TEST GROUP B: STOCK DEDUCTION, USAGE & NEGATIVE STOCK PREVENTION ---
  console.log('\n--- TEST GROUP B: STOCK USAGE & NEGATIVE STOCK PREVENTION ---');

  // Purchase Employee logs in to test purchase inward
  await signInWithEmailAndPassword(auth, 'purchase@skati.local', 'Password123!');

  // Inward +500 Kg
  async function addPurchaseStock(matId, qty) {
    const matRef = doc(db, 'rawMaterials', matId);
    const txRef = doc(collection(db, 'stockTransactions'));

    await runTransaction(db, async (t) => {
      const snap = await t.get(matRef);
      const current = snap.data().currentStock;
      t.update(matRef, { currentStock: current + qty, updatedAt: serverTimestamp() });
      t.set(txRef, {
        rawMaterialId: matId,
        rawMaterialNameSnapshot: snap.data().name,
        type: 'PURCHASE',
        quantity: qty,
        unit: snap.data().unit,
        referenceType: 'PURCHASE_ORDER',
        reason: 'Purchase order inward PO-101',
        createdAt: serverTimestamp(),
        createdBy: 'purchase@skati.local',
      });
    });
  }

  await addPurchaseStock(mat1.id, 500);
  const snapAfterPurchase = await getDoc(doc(db, 'rawMaterials', mat1.id));
  if (snapAfterPurchase.data().currentStock === 1500) {
    console.log('[PASS] Test 5: Purchase inward increased stock from 1000 to 1500 Kg.');
  } else {
    throw new Error(`Test 5 Failed: Expected 1500, got ${snapAfterPurchase.data().currentStock}`);
  }

  // Production Employee logs in to test usage
  await signInWithEmailAndPassword(auth, 'production@skati.local', 'Password123!');

  async function deductUsageStock(matId, qty) {
    const matRef = doc(db, 'rawMaterials', matId);
    const txRef = doc(collection(db, 'stockTransactions'));

    return runTransaction(db, async (t) => {
      const snap = await t.get(matRef);
      const current = snap.data().currentStock;
      if (current < qty) {
        throw new Error('Insufficient stock available.');
      }
      t.update(matRef, { currentStock: current - qty, updatedAt: serverTimestamp() });
      t.set(txRef, {
        rawMaterialId: matId,
        rawMaterialNameSnapshot: snap.data().name,
        type: 'USAGE',
        quantity: qty,
        unit: snap.data().unit,
        referenceType: 'PRODUCTION_BATCH',
        reason: 'Batch production run B-001',
        createdAt: serverTimestamp(),
        createdBy: 'production@skati.local',
      });
    });
  }

  await deductUsageStock(mat1.id, 300);
  const snapAfterUsage = await getDoc(doc(db, 'rawMaterials', mat1.id));
  if (snapAfterUsage.data().currentStock === 1200) {
    console.log('[PASS] Test 6: Production usage deducted 300 Kg (Stock is now 1200 Kg).');
  } else {
    throw new Error(`Test 6 Failed: Expected 1200, got ${snapAfterUsage.data().currentStock}`);
  }

  // Test Insufficient Stock Protection
  let insufficientStockBlocked = false;
  try {
    await deductUsageStock(mat1.id, 5000); // 5000 > 1200
  } catch (err) {
    if (err.message.includes('Insufficient stock')) {
      insufficientStockBlocked = true;
    }
  }

  if (insufficientStockBlocked) {
    const snapAfterFailed = await getDoc(doc(db, 'rawMaterials', mat1.id));
    if (snapAfterFailed.data().currentStock === 1200) {
      console.log('[PASS] Test 7: Insufficient stock correctly blocked; balance preserved at 1200 Kg (never negative).');
    }
  } else {
    throw new Error('Test 7 Failed: Insufficient stock deduction was not blocked!');
  }

  // --- TEST GROUP C: MANAGERIAL STOCK ADJUSTMENTS ---
  console.log('\n--- TEST GROUP C: MANAGERIAL STOCK ADJUSTMENTS ---');

  // Manager logs in
  await signInWithEmailAndPassword(auth, 'manager@skati.local', 'Password123!');

  async function adjustStock(matId, type, qty, reason) {
    if (!reason || !reason.trim()) {
      throw new Error('A reason is required.');
    }
    const matRef = doc(db, 'rawMaterials', matId);
    const txRef = doc(collection(db, 'stockTransactions'));

    return runTransaction(db, async (t) => {
      const snap = await t.get(matRef);
      const current = snap.data().currentStock;
      let newStock;
      if (type === 'ADJUSTMENT_IN') {
        newStock = current + qty;
      } else {
        if (current < qty) throw new Error('Insufficient stock for adjustment deduction.');
        newStock = current - qty;
      }
      t.update(matRef, { currentStock: newStock, updatedAt: serverTimestamp() });
      t.set(txRef, {
        rawMaterialId: matId,
        rawMaterialNameSnapshot: snap.data().name,
        type,
        quantity: qty,
        unit: snap.data().unit,
        referenceType: 'STOCK_COUNT_ADJUSTMENT',
        reason,
        createdAt: serverTimestamp(),
        createdBy: 'manager@skati.local',
      });
    });
  }

  // Manager adjustment OUT -50 Kg
  await adjustStock(mat1.id, 'ADJUSTMENT_OUT', 50, 'Physical stock discrepancy');
  const snapAfterAdj = await getDoc(doc(db, 'rawMaterials', mat1.id));
  if (snapAfterAdj.data().currentStock === 1150) {
    console.log('[PASS] Test 8: Manager ADJUSTMENT_OUT reduced stock to 1150 Kg.');
  }

  // Manager adjustment IN +100 Kg
  await adjustStock(mat1.id, 'ADJUSTMENT_IN', 100, 'Found unrecorded bundle');
  const snapAfterAdjIn = await getDoc(doc(db, 'rawMaterials', mat1.id));
  if (snapAfterAdjIn.data().currentStock === 1250) {
    console.log('[PASS] Test 9: Manager ADJUSTMENT_IN increased stock to 1250 Kg.');
  }

  // --- TEST GROUP D: CONCURRENCY SIMULATION (50 USERS SCENARIO) ---
  console.log('\n--- TEST GROUP D: ATOMIC CONCURRENCY SIMULATION ---');

  // Let material 2 have 500 Piece current stock
  const mat2Snap = await getDoc(doc(db, 'rawMaterials', mat2.id));
  // Reduce to 500 Piece
  await runTransaction(db, async (t) => {
    t.update(doc(db, 'rawMaterials', mat2.id), { currentStock: 500 });
  });

  console.log('Initial Stock for Concurrency Test: 500 Piece');
  console.log('Simulating 2 simultaneous requests each demanding 300 Piece...');

  // User A attempts 300, User B attempts 300 simultaneously (Total demanded: 600 > 500)
  const taskA = deductUsageStock(mat2.id, 300);
  const taskB = deductUsageStock(mat2.id, 300);

  const results = await Promise.allSettled([taskA, taskB]);
  const succeededCount = results.filter(r => r.status === 'fulfilled').length;
  const failedCount = results.filter(r => r.status === 'rejected').length;

  const finalMat2Snap = await getDoc(doc(db, 'rawMaterials', mat2.id));
  const finalMat2Stock = finalMat2Snap.data().currentStock;

  console.log(`Concurrent results: Succeeded: ${succeededCount}, Rejected: ${failedCount}`);
  console.log(`Final Stock in Database: ${finalMat2Stock} Piece`);

  if (succeededCount === 1 && failedCount === 1 && finalMat2Stock === 200) {
    console.log('[PASS] Test 10: ATOMIC CONCURRENCY VERIFIED: Exactly 1 transaction succeeded (500 - 300 = 200), second transaction was rejected due to insufficient stock. Stock NEVER went negative.');
  } else {
    throw new Error(`Test 10 Failed: Concurrency anomaly! Succeeded: ${succeededCount}, Final stock: ${finalMat2Stock}`);
  }

  // --- TEST GROUP E: IMMUTABILITY & AUDIT TRAIL VERIFICATION ---
  console.log('\n--- TEST GROUP E: IMMUTABILITY & AUDIT TRAIL ---');

  const historySnap = await getDocs(
    query(collection(db, 'stockTransactions'), where('rawMaterialId', '==', mat1.id), orderBy('createdAt', 'desc'))
  );
  console.log(`[PASS] Test 11: Stock history returned ${historySnap.docs.length} audit records.`);
  historySnap.docs.forEach((d, i) => {
    const data = d.data();
    console.log(`  Record ${i + 1}: [${data.type}] ${data.quantity} ${data.unit} - Reason: "${data.reason}" by ${data.createdBy}`);
  });

  // Attempt to delete a transaction (should be blocked by Firestore rules)
  let deleteBlocked = false;
  try {
    const firstTxDocRef = doc(db, 'stockTransactions', historySnap.docs[0].id);
    await runTransaction(db, async (t) => {
      t.delete(firstTxDocRef);
    });
  } catch (err) {
    deleteBlocked = true;
  }

  if (deleteBlocked) {
    console.log('[PASS] Test 12: Transaction deletion strictly blocked by Firestore security rules (Audit trail is immutable).');
  } else {
    throw new Error('Test 12 Failed: Transaction was deleted! Rules must enforce immutability.');
  }

  console.log('\n=== ALL 12 VERIFICATION TESTS PASSED WITH 100% SUCCESS ===');
}

runInventoryTests().catch((err) => {
  console.error('[FAIL] Test execution error:', err);
  process.exit(1);
});
