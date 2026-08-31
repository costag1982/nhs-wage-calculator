import React from 'react';
import { ShiftWorkType } from '../../../domain/models/Shift';
import { Briefcase, Clock, Zap, Palmtree } from 'lucide-react';

interface ShiftTypeSelectorProps {
  shiftType: ShiftWorkType;
  onSelectType: (type: ShiftWorkType) => void;
}

export const ShiftTypeSelector: React.FC<ShiftTypeSelectorProps> = ({
  shiftType,
  onSelectType,
}) => {
  return (
    <div className="segmented-control">
      <button
        type="button"
        className={`segmented-tab ${shiftType === 'SUBSTANTIVE' ? 'active' : ''}`}
        onClick={() => onSelectType('SUBSTANTIVE')}
      >
        <Briefcase size={12} />
        <span>Rostered</span>
      </button>
      <button
        type="button"
        className={`segmented-tab ${shiftType === 'OVERTIME' ? 'active overtime-active' : ''}`}
        onClick={() => onSelectType('OVERTIME')}
      >
        <Clock size={12} />
        <span>Extra / Overtime</span>
      </button>
      <button
        type="button"
        className={`segmented-tab ${shiftType === 'BANK' ? 'active bank-active' : ''}`}
        onClick={() => onSelectType('BANK')}
      >
        <Zap size={12} />
        <span>Bank Shift</span>
      </button>
      <button
        type="button"
        className={`segmented-tab ${shiftType === 'ANNUAL_LEAVE' ? 'active leave-active' : ''}`}
        onClick={() => onSelectType('ANNUAL_LEAVE')}
      >
        <Palmtree size={12} />
        <span>Annual Leave</span>
      </button>
    </div>
  );
};
