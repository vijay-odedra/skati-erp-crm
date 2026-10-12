import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import type { DashboardAlert, AlertSeverity } from '../../services/dashboard/dashboardTypes.ts';

interface AlertsPanelProps {
  alerts: DashboardAlert[];
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  }
> = {
  CRITICAL: {
    border: '#FECACA',
    bg: '#FEF2F2',
    text: '#991B1B',
    badgeBg: '#FEE2E2',
    icon: AlertOctagon,
  },
  WARNING: {
    border: '#FED7AA',
    bg: '#FFFBEB',
    text: '#92400E',
    badgeBg: '#FEF3C7',
    icon: AlertTriangle,
  },
  INFO: {
    border: '#BAE6FD',
    bg: '#F0F9FF',
    text: '#075985',
    badgeBg: '#E0F2FE',
    icon: Info,
  },
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D9EAF0',
          borderRadius: '10px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#15803D',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <ShieldCheck size={20} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>All Operations Normal</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            No critical alerts, stock deficits, or overdue items requiring immediate attention.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #D9EAF0',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#D97706" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            Action Required & Alerts
          </h3>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
          }}
        >
          {alerts.length} {alerts.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px' }}>
        {alerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
          const IconComp = config.icon;

          return (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <IconComp
                  size={18}
                  style={{ marginTop: '2px', color: config.text, flexShrink: 0 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: config.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>{alert.title}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: config.badgeBg,
                        color: config.text,
                        fontWeight: 700,
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    {alert.message}
                  </div>
                </div>
              </div>

              {alert.targetPath && (
                <Link
                  to={alert.targetPath}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#087EA4',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  <span>{alert.actionLabel || 'View'}</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
