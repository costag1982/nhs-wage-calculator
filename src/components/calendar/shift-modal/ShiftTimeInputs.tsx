import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ShiftTimeInputsProps {
  startTime: string;
  endTime: string;
  endTimeError: string | null;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

export const ShiftTimeInputs: React.FC<ShiftTimeInputsProps> = ({
  startTime,
  endTime,
  endTimeError,
  onStartTimeChange,
  onEndTimeChange,
}) => {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="shift-modal-start-time">
            Start Time
          </label>
          <input
            id="shift-modal-start-time"
            type="time"
            className="form-input"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="shift-modal-end-time">
            Finish Time
          </label>
          <input
            id="shift-modal-end-time"
            type="time"
            className="form-input"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            required
          />
        </div>
      </div>

      {endTimeError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--rose)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            marginTop: '-0.25rem',
            marginBottom: '0.75rem',
          }}
        >
          <AlertTriangle size={14} />
          {endTimeError}
        </div>
      )}
    </>
  );
};
