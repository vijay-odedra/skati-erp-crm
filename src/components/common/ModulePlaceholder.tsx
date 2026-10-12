import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { ROLE_LABELS } from '../../constants/permissions.ts';
import type { Permission } from '../../types/permissions.ts';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  requiredPermission: Permission;
  icon?: LucideIcon;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  requiredPermission,
  icon: Icon,
}) => {
  const { profile } = useAuth();
  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : 'User';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Module Title & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #D9EAF0',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {Icon && (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: '#E0F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={20} color="#087EA4" />
              </div>
            )}
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F2942', margin: 0 }}>
              {title}
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            {description}
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D9EAF0',
            borderRadius: '6px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#64748B' }}>Authorized:</span>
          <span style={{ fontWeight: 600, color: '#16A34A' }}>{roleLabel}</span>
        </div>
      </div>

      {/* Module Content Placeholder */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          padding: '32px',
          minHeight: '260px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '6px 12px',
            backgroundColor: '#F1F5F9',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#475569',
            marginBottom: '12px',
          }}
        >
          Module Foundation Ready
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F2942', marginBottom: '8px' }}>
          {title} Module Workspace
        </h3>
        <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', marginBottom: '16px', lineHeight: '1.5' }}>
          Access confirmed with permission <code style={{ color: '#087EA4', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: '4px' }}>{requiredPermission}</code>. Functional workflow will be initialized in dedicated business module milestones.
        </p>
      </div>
    </div>
  );
};
