import React from 'react';
import { Calendar } from 'lucide-react';

interface LeaveGuidanceCardProps {
  bankHolidayHours: number;
  totalEntitlementHours: number;
}

export const LeaveGuidanceCard: React.FC<LeaveGuidanceCardProps> = ({
  bankHolidayHours,
  totalEntitlementHours,
}) => {
  return (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '1.15rem 1.35rem',
        fontSize: '0.8125rem',
        color: 'var(--text-main)',
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: '0.4rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <Calendar size={16} style={{ color: 'var(--primary)' }} />
        NHS Agenda for Change (Section 13) Shift Rules
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: '1.25rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
        }}
      >
        <li>
          <strong>Hours Deduction:</strong> When you book leave against a rostered shift, only the
          exact net hours of that shift are deducted (e.g. 10.0h for Night Duty, 11.0h for a Long
          Day).
        </li>
        <li>
          <strong>Unpaid Breaks:</strong> Meal breaks are unpaid and therefore never deducted from
          your annual leave allowance.
        </li>
        <li>
          <strong>Public Holidays:</strong> Bank holidays ({bankHolidayHours}h) are included inside
          your {totalEntitlementHours}h total entitlement.
        </li>
        <li>
          <strong>AfC Absence Pay:</strong> When you take annual leave, you receive your basic pay
          plus Section 13 &quot;AfC Absence&quot; enhancements for unsocial hours earned over prior
          months.
        </li>
      </ul>
    </div>
  );
};
