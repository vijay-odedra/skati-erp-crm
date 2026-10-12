import React from 'react';
import type {
  OrderStatus,
  DispatchStatus,
  PaymentStatus,
} from '../../services/orders/orderTypes.ts';
import {
  ORDER_STATUS_CONFIG,
  DISPATCH_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
} from '../../constants/orders.ts';

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const conf = ORDER_STATUS_CONFIG[status] || {
    label: status,
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: conf.bgColor,
        color: conf.color,
        border: `1px solid ${conf.borderColor}`,
        whiteSpace: 'nowrap',
      }}
    >
      {conf.label}
    </span>
  );
};

interface DispatchStatusBadgeProps {
  status: DispatchStatus;
}

export const DispatchStatusBadge: React.FC<DispatchStatusBadgeProps> = ({ status }) => {
  const conf = DISPATCH_STATUS_CONFIG[status] || {
    label: status,
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: conf.bgColor,
        color: conf.color,
        border: `1px solid ${conf.borderColor}`,
        whiteSpace: 'nowrap',
      }}
    >
      {conf.label}
    </span>
  );
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const conf = PAYMENT_STATUS_CONFIG[status] || {
    label: status,
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: conf.bgColor,
        color: conf.color,
        border: `1px solid ${conf.borderColor}`,
        whiteSpace: 'nowrap',
      }}
    >
      {conf.label}
    </span>
  );
};
