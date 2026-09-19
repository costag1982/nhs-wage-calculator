import React, { useMemo, useState } from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { Shift } from '../../domain/models/Shift';
import {
  calculateAnnualLeaveBalance,
  formatLeaveYearDisplayRange,
} from '../../domain/services/annualLeaveCalculator';
import { LeaveHeaderBar } from './LeaveHeaderBar';
import { LeaveYearHeader } from './LeaveYearHeader';
import { LeaveDonutChart } from './LeaveDonutChart';
import { LeaveEntitlementTable } from './LeaveEntitlementTable';
import { LeaveEpisodesList } from './LeaveEpisodesList';
import { LeaveGuidanceCard } from './LeaveGuidanceCard';
import { EditEntitlementModal } from './EditEntitlementModal';

interface LeaveTrackerViewProps {
  profile: EmployeeProfile;
  shifts: Shift[];
  activeMonthDate: Date;
  onBookLeaveClick: () => void;
  onBack?: () => void;
  onEditShift?: (shift: Shift) => void;
  onOpenSettings?: () => void;
  onUpdateProfile?: (updated: Partial<EmployeeProfile>) => void;
}

export const LeaveTrackerView: React.FC<LeaveTrackerViewProps> = ({
  profile,
  shifts,
  activeMonthDate,
  onBookLeaveClick,
  onBack,
  onEditShift,
  onOpenSettings,
  onUpdateProfile,
}) => {
  const [leaveYearOffset, setLeaveYearOffset] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditEntitlementOpen, setIsEditEntitlementOpen] = useState<boolean>(false);

  const targetReferenceDate = useMemo(() => {
    if (leaveYearOffset === 0) {
      return new Date();
    }
    return new Date(
      activeMonthDate.getFullYear() + leaveYearOffset,
      activeMonthDate.getMonth(),
      activeMonthDate.getDate()
    );
  }, [activeMonthDate, leaveYearOffset]);

  const balanceSummary = useMemo(() => {
    return calculateAnnualLeaveBalance(profile, shifts, targetReferenceDate);
  }, [profile, shifts, targetReferenceDate]);

  const {
    entitlement,
    countdownText,
    leaveYearStart,
    leaveYearEnd,
    requestedHours,
    approvedHours,
    takenHours,
    remainingHours,
    episodes,
    approvedEpisodesCount,
    rejectedEpisodesCount,
  } = balanceSummary;

  const formattedLeaveYearRange = useMemo(
    () => formatLeaveYearDisplayRange(leaveYearStart, leaveYearEnd),
    [leaveYearStart, leaveYearEnd]
  );

  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return episodes;
    const q = searchQuery.toLowerCase();
    return episodes.filter(
      (ep) =>
        ep.formattedDateRange.toLowerCase().includes(q) ||
        ep.status.toLowerCase().includes(q) ||
        `${ep.daysCount} days`.includes(q)
    );
  }, [episodes, searchQuery]);

  return (
    <div
      className="leave-tracker-container"
      style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '3rem' }}
    >
      <LeaveHeaderBar
        onBack={onBack}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onBookLeaveClick={onBookLeaveClick}
      />

      <div
        className="card"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-light)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
        <LeaveYearHeader
          formattedLeaveYearRange={formattedLeaveYearRange}
          countdownText={countdownText}
          onPrevYear={() => setLeaveYearOffset((prev) => prev - 1)}
          onNextYear={() => setLeaveYearOffset((prev) => prev + 1)}
        />

        <LeaveDonutChart
          remainingHours={remainingHours}
          requestedHours={requestedHours}
          approvedHours={approvedHours}
          takenHours={takenHours}
          totalPot={entitlement.totalEntitlementHours}
        />

        <LeaveEntitlementTable
          entitlement={entitlement}
          onEditEntitlement={onUpdateProfile ? () => setIsEditEntitlementOpen(true) : undefined}
        />
      </div>

      <LeaveEpisodesList
        episodes={filteredEpisodes}
        approvedEpisodesCount={approvedEpisodesCount}
        rejectedEpisodesCount={rejectedEpisodesCount}
        remainingHours={remainingHours}
        formattedLeaveYearRange={formattedLeaveYearRange}
        searchQuery={searchQuery}
        shifts={shifts}
        onBookLeaveClick={onBookLeaveClick}
        onEditShift={onEditShift}
        onOpenSettings={onOpenSettings}
      />

      <LeaveGuidanceCard
        bankHolidayHours={entitlement.bankHolidayHours}
        totalEntitlementHours={entitlement.totalEntitlementHours}
      />

      {onUpdateProfile && (
        <EditEntitlementModal
          isOpen={isEditEntitlementOpen}
          profile={profile}
          onClose={() => setIsEditEntitlementOpen(false)}
          onSave={onUpdateProfile}
        />
      )}
    </div>
  );
};
