# SKATI ERP & CRM

An enterprise filtration manufacturing ERP & CRM platform engineered with **React**, **TypeScript**, **Vite**, and **Firebase (Authentication & Cloud Firestore)**.

---

## 🔑 SKATI ERP & CRM Login Credentials

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@skati.com` | `Password123!` | Full system access, users, settings, and all modules |
| **Manager** | `manager@skati.com` | `Password123!` | Operations, inventory adjustments, and reports |
| **Production** | `production@skati.com` | `Password123!` | Production entries, floor batches, and BOM review |
| **Purchase** | `purchase@skati.com` | `Password123!` | Raw materials, suppliers, and purchase orders |
| **Sales** | `sales@skati.com` | `Password123!` | CRM leads, quotations, orders, dispatches & payments |

> **Recommended for testing**: Sign in with **`admin@skati.com`** and **`Password123!`** to access all modules and capabilities.

---

## 🏭 Core Business Workflow

```text
RAW MATERIAL MASTER
       ↓
SUPPLIERS & PURCHASES
       ↓
PRODUCTS & BOM
       ↓
ATOMIC PRODUCTION
       ↓
CRM LEADS & CUSTOMERS
       ↓
COMMERCIAL QUOTATIONS
       ↓
SALES ORDERS
       ↓
DISPATCH & FULFILLMENT
       ↓
PAYMENTS & SETTLEMENTS
       ↓
DASHBOARD & BUSINESS REPORTS
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Java Runtime**: JDK 11+ or JDK 21+ (for Firebase Local Emulator Suite)

### 2. Environment Setup
Ensure your local environment configuration file (`.env.local`) exists with your Firebase web app keys:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=skati-erp-crm.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=skati-erp-crm
VITE_FIREBASE_STORAGE_BUCKET=skati-erp-crm.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_USE_FIREBASE_EMULATORS=true
```

### 3. Start Local Firebase Emulators
```bash
npx firebase emulators:start --project skati-erp-crm
```
* **Auth Emulator**: `http://127.0.0.1:9099`
* **Firestore Emulator**: `http://127.0.0.1:8080`
* **Emulator UI Dashboard**: `http://127.0.0.1:4000`

### 4. Seed Standard User Personas (If Needed)
```bash
node scratch/seed-users.mjs
```

### 5. Start Frontend Dev Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 Available Scripts

- `npm run dev` — Start Vite local development server with Hot Module Replacement (HMR).
- `npm run build` — Compile TypeScript and generate production Vite bundle.
- `npm run preview` — Preview the production build locally.
- `npm run lint` — Run Oxlint code analyzer across codebase.

---

## 🛡️ Security & Performance Highlights

- **Role-Based Access Control (RBAC)**: 5 discrete roles with independent Firestore Security Rules protecting 25 collections.
- **Atomic Multi-Document Transactions**: Strict non-negative inventory guarantees ($currentStock \ge 0$), preventing negative stock or over-dispatch under concurrent traffic.
- **Immutable Financial & Audit Ledgers**: Append-only ledgers for stock movements, production consumption, purchases, and payments.
- **Bounded Reads & Cursor Pagination**: All data tables use bounded limits and cursor pagination (`startAfter`) to ensure optimal performance on the Firebase Spark tier.
