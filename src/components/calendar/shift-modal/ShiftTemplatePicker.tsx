import React from 'react';
import { ShiftPreset, ShiftPresetType } from '../../../domain/models/Shift';
import { SHIFT_PRESETS } from './shiftModalConstants';

interface ShiftTemplatePickerProps {
  presetType: ShiftPresetType;
  presets?: ShiftPreset[];
  label?: string;
  onSelectPreset: (preset: ShiftPreset) => void;
}

export const ShiftTemplatePicker: React.FC<ShiftTemplatePickerProps> = ({
  presetType,
  presets = SHIFT_PRESETS,
  label,
  onSelectPreset,
}) => {
  return (
    <div className="form-group" style={{ gap: '0.2rem' }}>
      {label && <label className="form-label">{label}</label>}
      <div className="template-chips-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`template-chip ${presetType === preset.id ? 'active' : ''}`}
            onClick={() => onSelectPreset(preset)}
          >
            <span className="template-chip-label">{preset.label}</span>
            {preset.id !== 'CUSTOM' && (
              <span className="template-chip-time">
                {preset.startTime} - {preset.endTime}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
