import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { ROLE_LABELS } from '../../constants/permissions.ts';

export const AccessDenied: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    requiredPermission?: string;
    reason?: string;
    from?: { pathname?: string };
  } | null;

  const roleLabel = profile?.role ? ROLE_LABELS[profile.role] : 'Unassigned';

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D9EAF0',
          padding: '36px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(15, 41, 66, 0.04)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F2942',
            marginBottom: '8px',
            margin: '0 0 8px 0',
          }}
        >
          Access Restricted
        </h1>

        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: '1.6' }}>
          {state?.reason ||
            'You do not have the required permissions to access this module. Please contact your system administrator if you believe this is an error.'}
        </p>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '14px',
            marginBottom: '24px',
            textAlign: 'left',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#64748B' }}>Your Role:</span>
            <span style={{ fontWeight: 600, color: '#0F2942' }}>{roleLabel}</span>
          </div>
          {state?.requiredPermission && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Required Permission:</span>
              <code style={{ fontSize: '12px', color: '#075985', backgroundColor: '#E0F2FE', padding: '2px 6px', borderRadius: '4px' }}>
                {state.requiredPermission}
              </code>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#087EA4',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
