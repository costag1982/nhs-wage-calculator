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
        <Briefcase size={14} style={{ display: 'inline', marginRight: '4px' }} />
        Entry & Work Type
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'SUBSTANTIVE' ? 'active' : ''}`}
          onClick={() => onSelectType('SUBSTANTIVE')}
          style={{ textAlign: 'left', alignItems: 'flex-start', padding: '0.6rem 0.75rem' }}
        >
          <span style={{ fontWeight: 700 }}>Substantive Shift</span>
          <span className="preset-btn-time">Contracted post (counts towards weekly threshold)</span>
        </button>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'BANK' ? 'active' : ''}`}
          onClick={() => onSelectType('BANK')}
          style={{ textAlign: 'left', alignItems: 'flex-start', padding: '0.6rem 0.75rem' }}
        >
          <span style={{ fontWeight: 700, color: 'var(--indigo)' }}>Bank Shift</span>
          <span className="preset-btn-time">Paid at Bank Hourly Rate (separate)</span>
        </button>
        <button
          type="button"
          className={`preset-btn ${shiftType === 'ANNUAL_LEAVE' ? 'active' : ''}`}
          onClick={() => onSelectType('ANNUAL_LEAVE')}
          style={{
            textAlign: 'left',
            alignItems: 'flex-start',
            padding: '0.6rem 0.75rem',
            borderColor: shiftType === 'ANNUAL_LEAVE' ? 'var(--emerald)' : undefined,
          }}
        >
          <span style={{ fontWeight: 700, color: '#047857' }}>
            <Palmtree size={13} style={{ display: 'inline', marginRight: '3px' }} />
            Annual Leave
          </span>
          <span className="preset-btn-time">Paid time off (deducts from leave pot)</span>
        </button>
      </div>
    </div>
  );
};
