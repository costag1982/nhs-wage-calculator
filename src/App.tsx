import React, { useState, useMemo, useEffect } from 'react';
import { useContractSettings } from './hooks/useContractSettings';
import { useRoster } from './hooks/useRoster';
import { WageCalculatorService } from './domain/services/WageCalculatorService';
import { MetricCards } from './components/dashboard/MetricCards';
import { CalendarView } from './components/calendar/CalendarView';
import { ShiftListView } from './components/dashboard/ShiftListView';
import { EsrPayslip } from './components/payslip/EsrPayslip';
import { ShiftModal } from './components/calendar/ShiftModal';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { SyncBadge } from './components/dashboard/SyncBadge';
import { useCloudSync } from './hooks/useCloudSync';
import { Shift } from './domain/models/Shift';
import {
  Calendar as CalendarIcon,
  List,
  FileText,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  LogOut,
} from 'lucide-react';

type TabView = 'CALENDAR' | 'LIST' | 'PAYSLIP';

const STORAGE_KEY_ACTIVE_MONTH = 'nhs_active_month';
const STORAGE_KEY_ACTIVE_TAB = 'nhs_active_tab';

function getInitialActiveMonth(): Date {
  // 1. Check URL Query Parameters e.g. ?month=2026-08
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const monthParam = params.get('month');
    if (monthParam) {
      const [year, month] = monthParam.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }
  }

  // 2. Fallback to localStorage
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_MONTH);
  if (saved) {
    const [year, month] = saved.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      return new Date(year, month - 1, 1);
    }
  }

  // 3. Default to June 2026
  return new Date(2026, 5, 1);
}

function getInitialActiveTab(): TabView {
  // 1. Check URL Query Parameters e.g. ?tab=payslip
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab')?.toUpperCase() as TabView;
    if (tabParam === 'CALENDAR' || tabParam === 'LIST' || tabParam === 'PAYSLIP') {
      return tabParam;
    }
  }

  // 2. Fallback to localStorage
  const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB) as TabView;
  if (saved && (saved === 'CALENDAR' || saved === 'LIST' || saved === 'PAYSLIP')) {
    return saved;
  }

  return 'CALENDAR';
}

export const App: React.FC = () => {
  const [activeMonthDate, setActiveMonthDate] = useState<Date>(getInitialActiveMonth);
  const [activeTab, setActiveTab] = useState<TabView>(getInitialActiveTab);

  // Sync active month and tab to URL query parameters & localStorage
  useEffect(() => {
    const y = activeMonthDate.getFullYear();
    const m = String(activeMonthDate.getMonth() + 1).padStart(2, '0');
    const monthStr = `${y}-${m}`;

    // Update URL query params without reloading the page
    const url = new URL(window.location.href);
    url.searchParams.set('month', monthStr);
    url.searchParams.set('tab', activeTab.toLowerCase());
    window.history.replaceState(null, '', url.toString());

    // Also persist to localStorage
    localStorage.setItem(STORAGE_KEY_ACTIVE_MONTH, monthStr);
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTab);
  }, [activeMonthDate, activeTab]);

  // Handle browser Back/Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const monthParam = params.get('month');
      if (monthParam) {
        const [year, month] = monthParam.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
          setActiveMonthDate(new Date(year, month - 1, 1));
        }
      }

      const tabParam = params.get('tab')?.toUpperCase() as TabView;
      if (tabParam === 'CALENDAR' || tabParam === 'LIST' || tabParam === 'PAYSLIP') {
        setActiveTab(tabParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Modal & Drawer states
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [modalSelectedDate, setModalSelectedDate] = useState<string>('');
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cloud Sync integration ref to decouple callback creation
  const autoSyncRef = React.useRef<() => void>(() => {});
  const handleAutoSync = React.useCallback(() => {
    autoSyncRef.current();
  }, []);

  // Custom Hooks with auto-sync notifications
  const {
    profile,
    commitments,
    updateProfile,
    addCommitment,
    removeCommitment,
    resetToGemmaDefaults,
    reloadSettingsFromDatabase,
  } = useContractSettings(handleAutoSync);

  const {
    monthShifts,
    addShift,
    updateShift,
    deleteShift,
    clearMonthShifts,
    exportSqliteDatabase,
    importSqliteDatabase,
    reloadShiftsFromDatabase,
  } = useRoster(activeMonthDate, handleAutoSync);

  // Cloud Sync integration
  const {
    syncStatus,
    lastSyncedAt,
    errorMessage: syncErrorMessage,
    triggerSync,
    scheduleAutoSync,
  } = useCloudSync({
    isStorageReady: true,
    onRemoteDataLoaded: async () => {
      await Promise.all([reloadShiftsFromDatabase(), reloadSettingsFromDatabase()]);
    },
  });

  useEffect(() => {
    autoSyncRef.current = scheduleAutoSync;
  }, [scheduleAutoSync]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setActiveMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const activeMonthTitle = useMemo(() => {
    return activeMonthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [activeMonthDate]);

  // Master domain calculation
  const payslipSummary = useMemo(() => {
    return WageCalculatorService.calculateMonthlyPayslip(
      profile,
      monthShifts,
      commitments,
      activeMonthDate
    );
  }, [profile, monthShifts, commitments, activeMonthDate]);

  // Handlers for shift modal
  const handleOpenAddShift = (dateStr?: string) => {
    const targetDate =
      dateStr ||
      `${activeMonthDate.getFullYear()}-${String(activeMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    setModalSelectedDate(targetDate);
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift: Shift) => {
    setModalSelectedDate(shift.date);
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = (shiftData: Omit<Shift, 'id' | 'breakdown'>) => {
    if (editingShift) {
      updateShift(editingShift.id, shiftData);
    } else {
      addShift(shiftData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('__calc_auth_pass');
    sessionStorage.removeItem('__calc_auth_pass');
    window.location.reload();
  };

  return (
    <div className="app-container">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="nhs-logo-badge">NHS</div>
          <div className="brand-titles">
            <h1>Wage & Shift Calculator</h1>
            <p>Agenda for Change Section 2 Forecast & Digital ESR Payslip</p>
          </div>
        </div>

        {/* Month Navigation & Global Actions */}
        <div className="header-actions">
          <SyncBadge
            status={syncStatus}
            lastSyncedAt={lastSyncedAt}
            errorMessage={syncErrorMessage}
            onSyncClick={triggerSync}
            onConfigureClick={() => setIsSettingsOpen(true)}
          />

          <div className="month-nav-bar">
            <button
              type="button"
              className="nav-arrow-btn"
              onClick={handlePrevMonth}
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="month-title-wrapper">
              <span className="month-title">{activeMonthTitle}</span>
              <span className="month-pay-badge">Paid in {payslipSummary.monthYearString}</span>
            </div>
            <button
              type="button"
              className="nav-arrow-btn"
              onClick={handleNextMonth}
              title="Next month"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button type="button" className="btn btn-primary" onClick={() => handleOpenAddShift()}>
            <Plus size={16} />
            Add Shift
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure Band, salary, contracted hours & deductions"
          >
            <Settings size={16} />
            Settings
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
            title="Log out and lock calculator"
            style={{ color: 'var(--rose)' }}
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </header>

      {/* Main KPI Metric Cards */}
      <MetricCards summary={payslipSummary} />

      {/* View Switcher Tabs & Period Summary Controls */}
      <div className="view-tabs-container">
        <div className="view-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'CALENDAR' ? 'active' : ''}`}
            onClick={() => setActiveTab('CALENDAR')}
          >
            <CalendarIcon size={16} />
            Monthly Roster
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'LIST' ? 'active' : ''}`}
            onClick={() => setActiveTab('LIST')}
          >
            <List size={16} />
            Shifts List ({monthShifts.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'PAYSLIP' ? 'active' : ''}`}
            onClick={() => setActiveTab('PAYSLIP')}
          >
            <FileText size={16} />
            NHS ESR Payslip
          </button>
        </div>

        {monthShifts.length > 0 && (
          <button
            type="button"
            className="btn btn-danger"
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.8rem' }}
            onClick={clearMonthShifts}
            title="Clear all shifts for current month"
          >
            <RotateCcw size={14} />
            Clear Month
          </button>
        )}
      </div>

      {/* Active Tab Content */}
      <main>
        {activeTab === 'CALENDAR' && (
          <CalendarView
            activeMonthDate={activeMonthDate}
            shifts={monthShifts}
            hourlyRate={payslipSummary.hourlyRate}
            onSelectDate={handleOpenAddShift}
            onEditShift={handleOpenEditShift}
          />
        )}

        {activeTab === 'LIST' && (
          <ShiftListView
            shifts={monthShifts}
            onEditShift={handleOpenEditShift}
            onDeleteShift={deleteShift}
            onAddShiftClick={() => handleOpenAddShift()}
          />
        )}

        {activeTab === 'PAYSLIP' && <EsrPayslip profile={profile} summary={payslipSummary} />}
      </main>

      {/* Shift Edit / Add Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        selectedDate={modalSelectedDate}
        initialShift={editingShift}
        existingShifts={monthShifts}
        hourlyRate={payslipSummary.hourlyRate}
        defaultProfileBand={profile.band}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={deleteShift}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        profile={profile}
        commitments={commitments}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateProfile={updateProfile}
        onAddCommitment={addCommitment}
        onRemoveCommitment={removeCommitment}
        onResetDefaults={resetToGemmaDefaults}
        onExportSqlite={exportSqliteDatabase}
        onImportSqlite={importSqliteDatabase}
        onLogout={handleLogout}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onTriggerSync={triggerSync}
      />
    </div>
  );
};
