import React from 'react';
import { AnnualLeaveEntitlement } from '../../domain/services/annualLeaveCalculator';
import { Edit3 } from 'lucide-react';

interface LeaveEntitlementTableProps {
  entitlement: AnnualLeaveEntitlement;
  onEditEntitlement?: () => void;
}

export const LeaveEntitlementTable: React.FC<LeaveEntitlementTableProps> = ({
  entitlement,
  onEditEntitlement,
}) => {
  const breakdownRows = [
    { label: 'Base', value: entitlement.baseHours, isBold: true },
    { label: 'Carry Forward', value: entitlement.carryOverHours, isBold: false },
    { label: 'In Lieu', value: entitlement.inLieuHours, isBold: false },
    { label: 'Continuous Service', value: entitlement.continuousServiceHours, isBold: false },
    { label: 'Adjustment Amount', value: entitlement.adjustmentHours, isBold: false },
  ];

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-light)',
        paddingTop: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          Entitlement Breakdown
        </span>
        {onEditEntitlement && (
          <button
            type="button"
            onClick={onEditEntitlement}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              padding: '2px 4px',
            }}
          >
            <Edit3 size={13} />
            Edit Entitlement
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {breakdownRows.map((row) => (
          <div
            key={row.label}
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}
          >
            <span style={{ color: 'var(--text-main)' }}>{row.label}</span>
            <span style={{ fontWeight: row.isBold ? 700 : 600, color: 'var(--text-main)' }}>
              {row.value.toFixed(1)}
            </span>
          </div>
        ))}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.05rem',
            borderTop: '1px solid var(--border-light)',
            paddingTop: '0.65rem',
            marginTop: '0.2rem',
          }}
        >
          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>Total</span>
          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
            {entitlement.totalEntitlementHours.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};
