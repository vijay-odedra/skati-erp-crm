import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ProtectedRoute } from './routes/ProtectedRoute.tsx';
import { PermissionRoute } from './routes/PermissionRoute.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { Login } from './pages/auth/Login.tsx';
import { AccessDenied } from './pages/auth/AccessDenied.tsx';
import { DashboardPage } from './pages/modules/DashboardPage.tsx';
import { RawMaterialsPage } from './pages/modules/RawMaterialsPage.tsx';
import { ProductionPage } from './pages/modules/ProductionPage.tsx';
import { ProductsPage } from './pages/modules/ProductsPage.tsx';
import { PurchasesPage } from './pages/modules/PurchasesPage.tsx';
import { CRMPage } from './pages/modules/CRMPage.tsx';
import { SalesPage } from './pages/modules/SalesPage.tsx';
import { ReportsPage } from './pages/modules/ReportsPage.tsx';
import { SettingsPage } from './pages/modules/SettingsPage.tsx';
import { UsersPage } from './pages/modules/UsersPage.tsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes enclosed in AppLayout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <PermissionRoute permission="dashboard.view">
                  <DashboardPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/raw-materials"
              element={
                <PermissionRoute permission="raw_materials.view">
                  <RawMaterialsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/products"
              element={
                <PermissionRoute permission="products.view">
                  <ProductsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/production"
              element={
                <PermissionRoute permission="production.view">
                  <ProductionPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/finished-products"
              element={
                <PermissionRoute permission="products.view">
                  <ProductsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/purchases"
              element={
                <PermissionRoute permission="purchases.view">
                  <PurchasesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <PermissionRoute permission="suppliers.view">
                  <PurchasesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/crm"
              element={
                <PermissionRoute permission="crm.view">
                  <CRMPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <PermissionRoute permission="sales.view">
                  <SalesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PermissionRoute permission="reports.view">
                  <ReportsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PermissionRoute permission="users.view">
                  <UsersPage />
                </PermissionRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PermissionRoute permission="settings.view">
                  <SettingsPage />
                </PermissionRoute>
              }
            />
            <Route path="/access-denied" element={<AccessDenied />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
