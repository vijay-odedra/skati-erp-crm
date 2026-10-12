export type Permission =
  // Dashboard
  | 'dashboard.view'
  // Users & Roles Management
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.disable'
  | 'roles.view'
  | 'roles.update'
  // Raw Materials
  | 'raw_materials.view'
  | 'raw_materials.create'
  | 'raw_materials.update'
  // Purchases & Suppliers
  | 'purchases.view'
  | 'purchases.create'
  | 'purchases.update'
  | 'suppliers.view'
  | 'suppliers.create'
  | 'suppliers.update'
  // Production
  | 'production.view'
  | 'production.create'
  | 'production.update'
  // Finished Products & Products Master
  | 'finished_products.view'
  | 'products.view'
  | 'products.create'
  | 'products.update'
  // BOM
  | 'bom.view'
  | 'bom.create'
  | 'bom.update'
  | 'bom.delete'
  // CRM & Leads
  | 'crm.view'
  | 'crm.create'
  | 'crm.update'
  // Sales
  | 'sales.view'
  | 'sales.create'
  | 'sales.update'
  // Orders
  | 'orders.view'
  | 'orders.create'
  | 'orders.update'
  // Reports & Settings
  | 'reports.view'
  | 'settings.view';
