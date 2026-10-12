import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, AlertOctagon, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.ts';
import { deriveDashboardAlerts } from '../../services/dashboard/dashboardAlerts.ts';
import { fetchRoleScopedDashboardData } from '../../services/dashboard/dashboardQueries.ts';
import type { DashboardAlert, AlertSeverity } from '../../services/dashboard/dashboardTypes.ts';

const SEVERITY_ICONS: Record<AlertSeverity, React.ComponentType<{ size?: number; color?: string }>> = {
  CRITICAL: AlertOctagon,
  WARNING: AlertTriangle,
  INFO: Info,
};

const SEVERITY_COLORS: Record<AlertSeverity, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
  WARNING: { text: '#92400E', bg: '#FFFBEB', border: '#FED7AA' },
  INFO: { text: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
};

export const NotificationCenter: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.role) return;

    let isMounted = true;

    const loadAlerts = async () => {
      try {
        const queryData = await fetchRoleScopedDashboardData(profile.role);
        if (!isMounted) return;
        const derived = deriveDashboardAlerts(profile.role, queryData);
        setAlerts(derived);
      } catch (err) {
        console.error('Failed to load notification alerts:', err);
      }
    };

    loadAlerts();

    // Re-check periodically every 60 seconds
    const interval = setInterval(loadAlerts, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [profile?.role]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const criticalOrWarningCount = alerts.filter(
    (a) => a.severity === 'CRITICAL' || a.severity === 'WARNING'
  ).length;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        title="Notifications"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid #D9EAF0',
          backgroundColor: isOpen ? '#E0F2FE' : '#FFFFFF',
          color: isOpen ? '#087EA4' : '#64748B',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: criticalOrWarningCount > 0 ? '#DC2626' : '#087EA4',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '10px',
              padding: '1px 5px',
              lineHeight: 1.2,
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '360px',
            maxHeight: '480px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D9EAF0',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F2942' }}>
              Notifications & Alerts
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#E2E8F0',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {alerts.length} active
            </span>
          </div>

          <div
            style={{
              padding: '10px',
              overflowY: 'auto',
              maxHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {alerts.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                No active notifications or operational alerts.
              </div>
            ) : (
              alerts.map((alert) => {
                const Icon = SEVERITY_ICONS[alert.severity] || Info;
                const colors = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.INFO;

                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div style={{ marginTop: '2px', flexShrink: 0 }}>
                      <Icon size={16} color={colors.text} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: colors.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{alert.title}</span>
                        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {alert.severity}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          marginTop: '2px',
                          lineHeight: '1.4',
                        }}
                      >
                        {alert.message}
                      </div>

                      {alert.targetPath && (
                        <div style={{ marginTop: '6px' }}>
                          <Link
                            to={alert.targetPath}
                            onClick={() => setIsOpen(false)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#087EA4',
                              textDecoration: 'none',
                            }}
                          >
                            <span>{alert.actionLabel || 'View item'}</span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
