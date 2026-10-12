import React, { useState, useEffect } from 'react';
import {
  X,
  Factory,
  Layers,
  PackageCheck,
  Calendar,
  User,
  MapPin,
  FileText,
} from 'lucide-react';
import type { Production, ProductionItem } from '../../services/production/productionTypes.ts';
import { getProductionDetails } from '../../services/production/productions.ts';
import { getProductionAreaLabel, PRODUCTION_STATUS_CONFIG } from '../../constants/production.ts';
import { getProductUnitLabel } from '../../constants/products.ts';
import { getUnitLabel } from '../../constants/inventory.ts';

interface ProductionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionId: string;
}

export const ProductionDetailModal: React.FC<ProductionDetailModalProps> = ({
  isOpen,
  onClose,
  productionId,
}) => {
  const [production, setProduction] = useState<Production | null>(null);
  const [consumedItems, setConsumedItems] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productionId) {
      const loadDetails = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await getProductionDetails(productionId);
          if (res) {
            setProduction(res.production);
            setConsumedItems(res.consumedItems);
          } else {
            setError('Production record not found.');
          }
        } catch (err: unknown) {
          console.error('Failed to load production details:', err);
          setError(err instanceof Error ? err.message : 'Failed to load details.');
        } finally {
          setLoading(false);
        }
      };
      void loadDetails();
    }
  }, [isOpen, productionId]);

  if (!isOpen) return null;

  const statusConfig = production ? PRODUCTION_STATUS_CONFIG[production.status] : null;
  const createdAtStr = production?.createdAt?.toDate
    ? production.createdAt.toDate().toLocaleString()
    : '—';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 41, 66, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #D9EAF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFCFD',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: '#E0F2FE',
                color: '#087EA4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Factory size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0F2942' }}>
                  Production Batch: {production?.productionCode || '—'}
                </h3>
                {statusConfig && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                      border: `1px solid ${statusConfig.borderColor}`,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Immutable production output and raw material consumption audit record
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
              Loading production batch details...
            </div>
          ) : error || !production ? (
            <div style={{ padding: '24px', color: '#DC2626', backgroundColor: '#FEF2F2', borderRadius: '6px' }}>
              {error || 'Production details unavailable.'}
            </div>
          ) : (
            <>
              {/* Batch Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  backgroundColor: '#F8FAFC',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                    <PackageCheck size={14} />
                    <span>Finished Product:</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0F2942' }}>
                    {production.productNameSnapshot}
                  </div>
                  <div style={{ fontSize: '12px', color: '#087EA4', fontWeight: 600 }}>
                    {production.productCodeSnapshot}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                    <Factory size={14} />
                    <span>Quantity Produced:</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#16A34A' }}>
                    +{production.quantityProduced} {getProductUnitLabel(production.productUnitSnapshot)}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                    <MapPin size={14} />
                    <span>Production Area:</span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#0F2942' }}>
                    {getProductionAreaLabel(production.productionArea)}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                    <Calendar size={14} />
                    <span>Completed At:</span>
                  </div>
                  <div style={{ fontWeight: 500, color: '#0F2942' }}>{createdAtStr}</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                    <User size={14} />
                    <span>Operator UID:</span>
                  </div>
                  <div style={{ fontWeight: 500, color: '#64748B', fontSize: '12px' }}>
                    {production.createdBy}
                  </div>
                </div>

                {production.notes && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B', marginBottom: '4px' }}>
                      <FileText size={14} />
                      <span>Notes:</span>
                    </div>
                    <div style={{ color: '#0F2942' }}>{production.notes}</div>
                  </div>
                )}
              </div>

              {/* Raw Material Consumption Breakdown (BOM Snapshot) */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Layers size={16} color="#087EA4" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F2942' }}>
                    Raw Material Consumption Snapshot ({consumedItems.length} components consumed)
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Material Code</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Material Name</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Unit</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>Qty / Product</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>Total Consumed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumedItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#087EA4' }}>
                          {item.materialCodeSnapshot}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0F2942' }}>
                          {item.materialNameSnapshot}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>
                          {getUnitLabel(item.unit)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {item.quantityPerProduct}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#DC2626', textAlign: 'right' }}>
                          -{item.quantityConsumed} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FAFCFD',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F2942',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
