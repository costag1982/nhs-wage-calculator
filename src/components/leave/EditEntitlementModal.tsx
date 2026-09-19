import React, { useState } from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { roundHours } from '../../domain/utils/mathUtils';
import { X, Check, Palmtree } from 'lucide-react';

interface EditEntitlementModalProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  onClose: () => void;
  onSave: (updates: Partial<EmployeeProfile>) => void;
}

export const EditEntitlementModal: React.FC<EditEntitlementModalProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <EditEntitlementModalContent
      key={`${props.profile.annualLeaveBaseHoursOverride}-${props.profile.annualLeaveCarryOverHours}-${props.profile.annualLeaveInLieuHours}`}
      {...props}
    />
  );
};

const EditEntitlementModalContent: React.FC<EditEntitlementModalProps> = ({
  profile,
  onClose,
  onSave,
}) => {
  const [baseHours, setBaseHours] = useState<number>(profile.annualLeaveBaseHoursOverride ?? 187.5);
  const [carryForward, setCarryForward] = useState<number>(profile.annualLeaveCarryOverHours ?? 0);
  const [inLieu, setInLieu] = useState<number>(profile.annualLeaveInLieuHours ?? 0);
  const [continuousService, setContinuousService] = useState<number>(
    profile.annualLeaveContinuousServiceHours ?? 0
  );
  const [adjustment, setAdjustment] = useState<number>(profile.annualLeaveAdjustmentHours ?? 0);

  const totalEntitlement = roundHours(
    (baseHours || 0) +
      (carryForward || 0) +
      (inLieu || 0) +
      (continuousService || 0) +
      (adjustment || 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      annualLeaveBaseHoursOverride: baseHours,
      annualLeaveCarryOverHours: carryForward,
      annualLeaveInLieuHours: inLieu,
      annualLeaveContinuousServiceHours: continuousService,
      annualLeaveAdjustmentHours: adjustment,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%', padding: '1.5rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palmtree size={20} style={{ color: 'var(--emerald)' }} />
            <h2
              style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}
            >
              Edit Annual Leave Entitlement
            </h2>
          </div>
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="entitlement-base-hours">
              Base Entitlement (Hours)
            </label>
            <input
              id="entitlement-base-hours"
              type="number"
              step="0.5"
              min="0"
              className="form-input"
              value={baseHours}
              onChange={(e) => setBaseHours(parseFloat(e.target.value) || 0)}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Standard full leave year allowance (default 187.5h for Gemma)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="entitlement-carry-forward">
                Carry Forward (Hours)
              </label>
              <input
                id="entitlement-carry-forward"
                type="number"
                step="0.5"
                min="0"
                className="form-input"
                value={carryForward}
                onChange={(e) => setCarryForward(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="entitlement-in-lieu">
                In Lieu (Hours)
              </label>
              <input
                id="entitlement-in-lieu"
                type="number"
                step="0.5"
                className="form-input"
                value={inLieu}
                onChange={(e) => setInLieu(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="entitlement-continuous-service">
                Continuous Service (Hours)
              </label>
              <input
                id="entitlement-continuous-service"
                type="number"
                step="0.5"
                className="form-input"
                value={continuousService}
                onChange={(e) => setContinuousService(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="entitlement-adjustment">
                Adjustment Amount (Hours)
              </label>
              <input
                id="entitlement-adjustment"
                type="number"
                step="0.5"
                className="form-input"
                value={adjustment}
                onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Live Total Display */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.25rem',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Total Calculated Entitlement
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)', marginTop: '2px' }}>
                Base + Carry Forward + In Lieu + Adjustments
              </div>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--emerald)' }}>
              {totalEntitlement.toFixed(1)}h
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.75rem',
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={16} />
              Save Entitlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
