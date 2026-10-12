import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowUpRight, Calendar, FileText } from 'lucide-react';
import type { CrmSummaryData } from '../../services/dashboard/dashboardTypes.ts';

interface CrmSummaryProps {
  data?: CrmSummaryData;
}

export const CrmSummary: React.FC<CrmSummaryProps> = ({ data }) => {
  if (!data) return null;

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
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="#087EA4" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F2942' }}>
            CRM & Sales Pipeline
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/crm/leads"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#087EA4',
              textDecoration: 'none',
            }}
          >
            <span>Leads</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link
            to="/crm/quotations"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#087EA4',
              textDecoration: 'none',
            }}
          >
            <span>Quotations</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Pipeline metrics grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
              NEW LEADS
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F2942', marginTop: '2px' }}>
              {data.newLeadsCount}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: data.overdueFollowUpsCount > 0 ? '#FEF2F2' : '#FFFBEB',
              borderRadius: '8px',
              border: `1px solid ${data.overdueFollowUpsCount > 0 ? '#FECACA' : '#FED7AA'}`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: data.overdueFollowUpsCount > 0 ? '#991B1B' : '#92400E',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Calendar size={12} />
              <span>FOLLOW-UPS DUE</span>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: data.overdueFollowUpsCount > 0 ? '#DC2626' : '#B45309',
                marginTop: '2px',
              }}
            >
              {data.followUpsDueCount}
            </div>
            {data.overdueFollowUpsCount > 0 && (
              <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 600, marginTop: '2px' }}>
                {data.overdueFollowUpsCount} overdue
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#F0FDF4',
              borderRadius: '8px',
              border: '1px solid #BBF7D0',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <FileText size={12} />
              <span>QUOTATIONS</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803D', marginTop: '2px' }}>
              {data.recentQuotationsCount}
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
              {data.acceptedQuotationsCount} accepted
            </div>
          </div>
        </div>

        {/* Recent Active Customers */}
        {data.recentCustomers && data.recentCustomers.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>
              Recent Customers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.recentCustomers.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <Link
                      to={`/crm/customers/${c.id}`}
                      style={{ fontWeight: 600, color: '#087EA4', textDecoration: 'none' }}
                    >
                      {c.companyName || (c as unknown as { name?: string }).name || 'Customer'}
                    </Link>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {c.contactPerson || ''} {c.phone ? `• ${c.phone}` : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: c.isActive ? '#DCFCE7' : '#F1F5F9',
                      color: c.isActive ? '#15803D' : '#64748B',
                    }}
                  >
                    {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
