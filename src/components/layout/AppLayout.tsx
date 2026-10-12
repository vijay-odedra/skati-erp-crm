import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Factory,
  PackageCheck,
  ShoppingBag,
  Users2,
  TrendingUp,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { ROLE_LABELS } from '../../constants/permissions.ts';
import type { Permission } from '../../types/permissions.ts';
import { NotificationCenter } from './NotificationCenter.tsx';

interface NavItemConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    path: '/raw-materials',
    label: 'Raw Materials',
    icon: Boxes,
    permission: 'raw_materials.view',
  },
  {
    path: '/products',
    label: 'Products & BOM',
    icon: PackageCheck,
    permission: 'products.view',
  },
  {
    path: '/production',
    label: 'Production',
    icon: Factory,
    permission: 'production.view',
  },
  {
    path: '/purchases',
    label: 'Purchase & Suppliers',
    icon: ShoppingBag,
    permission: 'purchases.view',
  },
  {
    path: '/crm',
    label: 'CRM & Leads',
    icon: Users2,
    permission: 'crm.view',
  },
  {
    path: '/sales',
    label: 'Sales & Orders',
    icon: TrendingUp,
    permission: 'sales.view',
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: FileBarChart,
    permission: 'reports.view',
  },
  {
    path: '/users',
    label: 'User Management',
    icon: ShieldCheck,
    permission: 'users.view',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'settings.view',
  },
];

export const AppLayout: React.FC = () => {
  const { profile, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const permittedNavItems = NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  );

  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : 'User';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4FAFC' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #D9EAF0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid #D9EAF0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#087EA4',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '0.5px',
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#0F2942', lineHeight: '1.2' }}>
              SKATI ERP
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, letterSpacing: '0.5px' }}>
              INDUSTRIAL SUITE
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#94A3B8',
              fontWeight: 600,
              padding: '0 12px 10px 12px',
            }}
          >
            Modules
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {permittedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#087EA4' : '#0F2942',
                      backgroundColor: isActive ? '#E0F2FE' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <Icon size={18} color={isActive ? '#087EA4' : '#64748B'} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Card & Logout in Sidebar footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #D9EAF0',
            backgroundColor: '#FAFCFD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#E0F2FE',
                color: '#075985',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <UserIcon size={18} />
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F2942',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={profile?.displayName || profile?.email || 'User'}
              >
                {profile?.displayName || profile?.email || 'User'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#075985',
                  backgroundColor: '#E0F2FE',
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  marginTop: '2px',
                }}
              >
                {roleLabel}
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            type="button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #D9EAF0',
              backgroundColor: '#FFFFFF',
              color: '#DC2626',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background-color 0.15s',
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #D9EAF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
              SKATI Manufacturing System
            </span>
            <span style={{ color: '#94A3B8' }}>/</span>
            <span style={{ fontSize: '13px', color: '#087EA4', fontWeight: 600 }}>
              {permittedNavItems.find((item) => location.pathname.startsWith(item.path))?.label ||
                'Workspace'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationCenter />
            <span
              style={{
                fontSize: '12px',
                color: '#64748B',
                backgroundColor: '#F4FAFC',
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid #D9EAF0',
              }}
            >
              Role: <strong style={{ color: '#0F2942' }}>{roleLabel}</strong>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
