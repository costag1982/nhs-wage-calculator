import React from 'react';
import { ShiftPreset, ShiftPresetType } from '../../../domain/models/Shift';
import { SHIFT_PRESETS } from './shiftModalConstants';

interface ShiftTemplatePickerProps {
  presetType: ShiftPresetType;
  onSelectPreset: (preset: ShiftPreset) => void;
}

export const ShiftTemplatePicker: React.FC<ShiftTemplatePickerProps> = ({
  presetType,
  onSelectPreset,
}) => {
  return (
    <div className="form-group">
      <label className="form-label">Shift Template</label>
      <div className="preset-buttons-grid">
        {SHIFT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-btn ${presetType === preset.id ? 'active' : ''}`}
            onClick={() => onSelectPreset(preset)}
          >
            <span>{preset.label}</span>
            {preset.id !== 'CUSTOM' && (
              <span className="preset-btn-time">
                {preset.startTime} - {preset.endTime}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
