import React from 'react';
import { ShiftWorkType } from '../../../domain/models/Shift';
import { Briefcase, Palmtree } from 'lucide-react';

interface ShiftTypeSelectorProps {
  shiftType: ShiftWorkType;
  onSelectType: (type: ShiftWorkType) => void;
}

export const ShiftTypeSelector: React.FC<ShiftTypeSelectorProps> = ({
  shiftType,
  onSelectType,
}) => {
  return (
    <div className="form-group">
      <label className="form-label">
        <Briefcase size={13} style={{ display: 'inline', marginRight: '4px' }} />
        Entry & Work Type
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'SUBSTANTIVE' ? 'active' : ''}`}
          onClick={() => onSelectType('SUBSTANTIVE')}
          style={{ padding: '0.45rem 0.5rem', textAlign: 'center', alignItems: 'center' }}
        >
          <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Substantive</span>
          <span className="preset-btn-time">Contracted (26h)</span>
        </button>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'BANK' ? 'active' : ''}`}
          onClick={() => onSelectType('BANK')}
          style={{ padding: '0.45rem 0.5rem', textAlign: 'center', alignItems: 'center' }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: shiftType === 'BANK' ? 'inherit' : 'var(--indigo)',
            }}
          >
            Bank Shift
          </span>
          <span className="preset-btn-time">Hourly Extra</span>
        </button>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'ANNUAL_LEAVE' ? 'active' : ''}`}
          onClick={() => onSelectType('ANNUAL_LEAVE')}
          style={{
            padding: '0.45rem 0.5rem',
            textAlign: 'center',
            alignItems: 'center',
            borderColor: shiftType === 'ANNUAL_LEAVE' ? 'var(--emerald)' : undefined,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.8125rem',
              color: shiftType === 'ANNUAL_LEAVE' ? 'inherit' : '#047857',
            }}
          >
            <Palmtree size={12} style={{ display: 'inline', marginRight: '2px' }} />
            Annual Leave
          </span>
          <span className="preset-btn-time">Paid Time Off</span>
        </button>
      </div>
    </div>
  );
};
