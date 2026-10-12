# SKATI ERP & CRM — PERSISTENT FIREBASE EMULATOR & COMPLETE UAT REPORT

**Project**: SKATI ERP & CRM  
**Date**: October 5, 2026  
**Environment**: Local Firebase Emulator Suite (Auth: 9099, Firestore: 8080, UI: 4000, Vite: 5173)  
**Final Status**: **PERSISTENCE + UAT PASSED**

---

## 1. Persistence Configuration & Setup

### Configuration Details
- **Persistence Storage Directory**: `./emulator-data` (at root workspace `/home/vijay-odedra/Documents/skati-erp-crm/emulator-data`)
- **Flags Configured**: `--import=./emulator-data --export-on-exit=./emulator-data`
- **package.json Scripts Configured**:
  ```json
  "firebase:emulators": "firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data"
  ```
- **Export Command for Checkpoints**:
  ```bash
  npx firebase emulators:export ./emulator-data --project skati-erp-crm --force
  ```

---

## 2. Persistence Proof of Concept (Phase 2 & Phase 3)

Before populating the business dataset, persistence capability was isolated and validated with a dedicated probe record:

1. **Proof Record Created**:
   - Collection: `rawMaterials`
   - Document ID: `rm-proof-test`
   - Name: `PERSISTENCE PROOF TEST`
   - Code: `RM-PROOF-001`
   - Opening Stock: `999 kg`
2. **Export & Restart**:
   - `npx firebase emulators:export ./emulator-data --force`
   - Emulator suite cleanly terminated and restarted with `--import=./emulator-data`
3. **Verification**:
   - `rm-proof-test` retrieved successfully with all fields and 999 kg intact.
4. **Cleanup**:
   - `rm-proof-test` and its corresponding stock transaction safely deleted; verified 0 residual proof records.

---

## 3. End-to-End Business Workflow Execution (Pre-Restart)

The complete multi-role business cycle was created using official service transactions:

| Step | Module | Action | Document Code / ID | Quantities / Values | Stock / Status Effect |
|---|---|---|---|---|---|
| 1 | **Auth** | Multi-Role Login Verification | All 5 Role Users | 5 Role Accounts Active | `admin`, `manager`, `production`, `purchase`, `sales` authenticated |
| 2 | **Raw Materials** | 4 Items Initial Opening Stock | `RM-UAT-001` to `RM-UAT-004` | 500kg, 200m, 500pcs, 300pcs | Initialized in `rawMaterials` and `stockTransactions` |
| 3 | **Suppliers** | Create Supplier | `SUP-UAT-001` | `TEST UAT - Filter Materials Supplier` | Created & Active |
| 4 | **Purchases** | Purchase Receipt (SS Sheet) | `PUR-UAT-001` / `INV-2026-001` | 500 kg @ ₹100 = ₹50,000 | SS Sheet stock updated from 500 kg $\rightarrow$ **1,000 kg** |
| 5 | **Products** | Create Finished Good | `PROD-UAT-001` | `TEST UAT - Mini Filter A` (₹5,000) | Initialized in `products` & `finishedProductStock` (0 pcs) |
| 6 | **BOM** | Multi-Item BOM Definition | 4 BOM Items | 2kg Sheet, 1m Media, 2pc Gasket, 1pc Rod | RM Stock untouched (1,000 kg SS Sheet preserved) |
| 7 | **Production** | Batch Run (Second Floor) | `PR-UAT-001` | 10 units produced | RM Consumed (20kg, 10m, 20pcs, 10pcs); FG Stock: **10 pcs** |
| 8 | **CRM** | Lead & Follow-up | `LEAD-UAT-001` / `fu-uat-001` | `TEST UAT - Industrial Customer` | Follow-up call logged & completed |
| 9 | **Customers** | Convert Lead to Customer | `CUST-UAT-001` / `REQ-UAT-001` | Requirement: 10 units Mini Filter A | Lead status `CONVERTED`, Customer active |
| 10 | **Quotations** | Quotation Generation & Accept | `QUOT-UAT-001` | Subtotal: ₹50,000, 18% GST: ₹9,000 | Grand Total: **₹59,000** (Status: `ACCEPTED`) |
| 11 | **Sales Orders**| Convert Quotation to Order | `ORD-UAT-001` / `pol-uat-001` | 10 units @ ₹5,000 + 18% GST | Grand Total: **₹59,000**, Linked to Production |
| 12 | **Dispatch 1**| Partial Dispatch Part 1 | `DSP-UAT-001` | 4 units dispatched | FG Stock: **6 pcs**, Order: `PARTIALLY_DISPATCHED` |
| 13 | **Dispatch 2**| Final Dispatch Part 2 | `DSP-UAT-002` | 6 units dispatched | FG Stock: **0 pcs**, Order: `DISPATCHED` (10/10) |
| 14 | **Payment 1** | Payment Receipt Part 1 | `REC-UAT-001` | ₹20,000 Bank Transfer | Paid: ₹20,000, Pending: ₹39,000, Status: `PARTIAL` |
| 15 | **Payment 2** | Final Payment Receipt Part 2 | `REC-UAT-002` | ₹39,000 Bank Transfer | Paid: ₹59,000, Pending: **₹0**, Order: `COMPLETED` / `PAID` |

---

## 4. Controlled Emulator Restart Execution

1. **State Export**:
   - Ran `npx firebase emulators:export ./emulator-data --project skati-erp-crm --force`
   - Verified output: `Export complete. Exported data saved in ./emulator-data`
2. **Graceful Shutdown**:
   - Process groups terminated cleanly. Port verification showed 9099 and 8080 released.
3. **Cold Restart**:
   - Emulators launched with `--import=./emulator-data --export-on-exit=./emulator-data`.
   - Verified endpoints: `http://localhost:9099/` (`ready: true`) and `http://localhost:8080/` (`Ok`).

---

## 5. Post-Restart Reconciliation & Verification

All 52 automated assertions passed against the freshly restarted Firebase Emulator:

### Mathematical Stock Reconciliation
| Item | Initial Stock | Inward (PO) | Outward (Prod) | Post-Restart Stock | Expected | Status |
|---|---|---|---|---|---|---|
| **SS Sheet (`RM-UAT-001`)** | 500 kg | +500 kg | -20 kg | **980 kg** | 980 kg | **PASS** |
| **Filter Media (`RM-UAT-002`)** | 200 m | 0 | -10 m | **190 m** | 190 m | **PASS** |
| **Rubber Gasket (`RM-UAT-003`)** | 500 pcs | 0 | -20 pcs | **480 pcs** | 480 pcs | **PASS** |
| **Support Rod (`RM-UAT-004`)** | 300 pcs | 0 | -10 pcs | **290 pcs** | 290 pcs | **PASS** |
| **Finished Good (`PROD-UAT-001`)**| 0 pcs | +10 pcs (Prod) | -10 pcs (Dsp) | **0 pcs** | 0 pcs | **PASS** |

### Financial & Order Reconciliation
| Metric | Stored Post-Restart | Calculated Expected | Formula | Status |
|---|---|---|---|---|
| **Quotation Subtotal** | ₹50,000 | ₹50,000 | $10 \times 5,000$ | **PASS** |
| **Quotation GST (18%)** | ₹9,000 | ₹9,000 | $50,000 \times 0.18$ | **PASS** |
| **Quotation Grand Total** | ₹59,000 | ₹59,000 | $50,000 + 9,000$ | **PASS** |
| **Order Total** | ₹59,000 | ₹59,000 | $50,000 + 9,000$ | **PASS** |
| **Order Paid Amount** | ₹59,000 | ₹59,000 | $20,000 + 39,000$ | **PASS** |
| **Order Pending Balance** | **₹0** | **₹0** | $59,000 - 59,000$ | **PASS** |
| **Total Dispatched Units** | 10 | 10 | $4 + 6$ | **PASS** |
| **Sales Order Status** | `COMPLETED` | `COMPLETED` | Fully Dispatched & Paid | **PASS** |
| **Payment Status** | `PAID` | `PAID` | Balance = ₹0 | **PASS** |

---

## 6. Functional & Multi-Role Verification

- **Role Authentication**:
  - `admin@skati.com`: **PASS**
  - `manager@skati.com`: **PASS**
  - `production@skati.com`: **PASS**
  - `purchase@skati.com`: **PASS**
  - `sales@skati.com`: **PASS**
- **Dashboard Post-Restart KPIs**:
  - Raw Materials in Stock: 4 Active Items
  - Total Raw Materials Inventory Value: $(980 \times 100) + (190 \times 45) + (480 \times 5) + (290 \times 25) = \text{₹}116,200$
  - Production Batches Completed: 1
  - Sales Orders: 1 (Completed)
  - Total Sales Revenue: ₹59,000
  - Pending Receivables: ₹0
- **Build & Quality Check**:
  - `npm run build`: Exit Code 0 (Production bundle generated cleanly)
  - `npm run lint`: Exit Code 0 (0 errors)

---

## 7. Post-Restart Firestore Collection Record Summary

| Collection | Document Count | Key Verified Record ID / Code |
|---|---|---|
| `users` | 5 | `admin`, `manager`, `production`, `purchase`, `sales` |
| `rawMaterials` | 4 | `rm-uat-ss-sheet`, `rm-uat-filter-media`, `rm-uat-rubber-gasket`, `rm-uat-support-rod` |
| `stockTransactions` | 6 | `TX-INIT-RM-*`, `TX-PUR-UAT-001`, `TX-PR-UAT-*` |
| `suppliers` | 1 | `sup-uat-001` (`SUP-UAT-001`) |
| `purchases` | 1 | `pur-uat-001` (`PUR-UAT-001`) |
| `purchaseItems` | 1 | `poi-uat-001` |
| `products` | 1 | `prod-uat-mini-filter-a` (`PROD-UAT-001`) |
| `finishedProductStock` | 1 | `prod-uat-mini-filter-a` (0 units available) |
| `finishedProductTransactions` | 3 | 1 Inward (`PRODUCTION_IN`), 2 Outward (`DISPATCH_OUT`) |
| `bomItems` | 4 | 4 Components configured |
| `productions` | 1 | `pr-uat-001` (`PR-UAT-001`) |
| `productionItems` | 4 | Consumption snapshots |
| `leads` | 1 | `lead-uat-001` (`LEAD-UAT-001`, `CONVERTED`) |
| `followUps` | 1 | `fu-uat-001` (`COMPLETED`) |
| `customers` | 1 | `cust-uat-001` (`CUST-UAT-001`) |
| `customerRequirements` | 1 | `req-uat-001` (`REQ-UAT-001`) |
| `quotations` | 1 | `qt-uat-001` (`QUOT-UAT-001`, `ACCEPTED`) |
| `quotationItems` | 1 | `qti-uat-001` |
| `orders` | 1 | `ord-uat-001` (`ORD-UAT-001`, `COMPLETED`) |
| `orderItems` | 1 | `ordi-uat-001` |
| `productionOrderLinks` | 1 | `pol-uat-001` |
| `dispatches` | 2 | `dsp-uat-001` (4 units), `dsp-uat-002` (6 units) |
| `dispatchItems` | 2 | `dspi-uat-001`, `dspi-uat-002` |
| `payments` | 2 | `pay-uat-001` (₹20,000), `pay-uat-002` (₹39,000) |

---

## 8. Final Verdict

# `PERSISTENCE + UAT PASSED`

- **Persistence**: Verified across proof test and full UAT dataset restarts with 100% data fidelity.
- **Business Workflow**: Verified across all 10 stages (Raw Materials $\rightarrow$ Purchase $\rightarrow$ BOM $\rightarrow$ Production $\rightarrow$ CRM $\rightarrow$ Quotation $\rightarrow$ Order $\rightarrow$ Dispatch $\rightarrow$ Payment $\rightarrow$ Reconciliation).
- **Integrity**: Exact numerical, stock, financial, and relational consistency maintained before and after cold emulator restarts.
