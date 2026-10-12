import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div
      style={{
        padding: '32px 20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        backgroundColor: '#FAFCFD',
        border: '1px dashed #D9EAF0',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#E0F2FE',
          color: '#087EA4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F2942' }}>{title}</div>
      {description && (
        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', maxWidth: '320px' }}>
          {description}
        </div>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: '12px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid #087EA4',
            backgroundColor: '#FFFFFF',
            color: '#087EA4',
            cursor: 'pointer',
          }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
