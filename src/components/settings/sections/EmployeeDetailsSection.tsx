import React from 'react';
import { EmployeeProfile } from '../../../domain/models/Contract';
import { User } from 'lucide-react';

interface EmployeeDetailsSectionProps {
  profile: EmployeeProfile;
  onUpdateProfile: (updated: Partial<EmployeeProfile>) => void;
}

export const EmployeeDetailsSection: React.FC<EmployeeDetailsSectionProps> = ({
  profile,
  onUpdateProfile,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-title">
        <User size={17} />
        <span>Employee & Hospital Details (ESR Header)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="settings-employee-name">
            Employee Name
          </label>
          <input
            id="settings-employee-name"
            type="text"
            className="form-input"
            value={profile.employeeName}
            onChange={(e) => onUpdateProfile({ employeeName: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="settings-department">
              Department
            </label>
            <input
              id="settings-department"
              type="text"
              className="form-input"
              value={profile.department}
              onChange={(e) => onUpdateProfile({ department: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="settings-job-title">
              Job Title
            </label>
            <input
              id="settings-job-title"
              type="text"
              className="form-input"
              value={profile.jobTitle}
              onChange={(e) => onUpdateProfile({ jobTitle: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="settings-location">
            Hospital / Location
          </label>
          <input
            id="settings-location"
            type="text"
            className="form-input"
            value={profile.location}
            onChange={(e) => onUpdateProfile({ location: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
