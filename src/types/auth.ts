export type UserRole =
  | 'admin'
  | 'manager'
  | 'production_employee'
  | 'purchase_employee'
  | 'sales_employee';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}
