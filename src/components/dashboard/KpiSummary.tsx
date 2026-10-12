import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { KpiCardData, KpiVariant } from '../../services/dashboard/dashboardTypes.ts';

interface KpiSummaryProps {
  kpis: KpiCardData[];
}

const VARIANT_CONFIG: Record<
  KpiVariant,
  { border: string; bg: string; text: string; badgeBg: string }
> = {
  default: {
    border: '#D9EAF0',
    bg: '#FFFFFF',
    text: '#0F2942',
    badgeBg: '#F1F5F9',
  },
  success: {
    border: '#BBF7D0',
    bg: '#F0FDF4',
    text: '#15803D',
    badgeBg: '#DCFCE7',
  },
  warning: {
    border: '#FED7AA',
    bg: '#FFFBEB',
    text: '#B45309',
    badgeBg: '#FEF3C7',
  },
  danger: {
    border: '#FECACA',
    bg: '#FEF2F2',
    text: '#B91C1C',
    badgeBg: '#FEE2E2',
  },
  info: {
    border: '#BAE6FD',
    bg: '#F0F9FF',
    text: '#0369A1',
    badgeBg: '#E0F2FE',
  },
};

export const KpiSummary: React.FC<KpiSummaryProps> = ({ kpis }) => {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
        gap: '16px',
      }}
    >
      {kpis.map((kpi) => {
        const conf = VARIANT_CONFIG[kpi.variant || 'default'];

        let formattedValue: string = String(kpi.value);
        if (kpi.format === 'currency' && typeof kpi.value === 'number') {
          formattedValue = `₹${kpi.value.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        } else if (kpi.format === 'number' && typeof kpi.value === 'number') {
          formattedValue = kpi.value.toLocaleString('en-IN');
        }

        return (
          <div
            key={kpi.id}
            style={{
              backgroundColor: conf.bg,
              border: `1px solid ${conf.border}`,
              borderRadius: '10px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              transition: 'transform 0.1s ease',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{kpi.label}</span>
                {kpi.actionLink && (
                  <Link
                    to={kpi.actionLink}
                    style={{
                      color: '#087EA4',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={kpi.actionLabel || 'View module'}
                  >
                    <ArrowUpRight size={14} />
                  </Link>
                )}
              </div>

              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 700,
                  color: conf.text,
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                }}
              >
                <span>{formattedValue}</span>
                {kpi.unit && (
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748B' }}>
                    {kpi.unit}
                  </span>
                )}
              </div>
            </div>

            {kpi.subtext && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  marginTop: '10px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                  paddingTop: '8px',
                }}
              >
                {kpi.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
