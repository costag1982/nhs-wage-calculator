import React from 'react';
import { EmployeeProfile } from '../../domain/models/Contract';
import { PayslipSummary } from '../../domain/models/Payslip';
import { Printer } from 'lucide-react';

interface EsrPayslipProps {
  profile: EmployeeProfile;
  summary: PayslipSummary;
}

export const EsrPayslip: React.FC<EsrPayslipProps> = ({ profile, summary }) => {
  const formatCurrency = (val: number) =>
    val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
            NHS Electronic Staff Record (ESR) Payslip
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Digital forecast replica for {summary.monthYearString} (hours worked in {summary.rosterMonthString})
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>

      <div className="esr-payslip-wrapper">
        {/* Header Grid */}
        <div className="esr-header-grid">
          <div className="esr-header-cell">
            <div className="cell-label">PAY ADVICE</div>
            <div className="cell-value">{summary.payDate}</div>
          </div>
          <div className="esr-header-cell">
            <div className="cell-label">EMPLOYEE NAME</div>
            <div className="cell-value">{profile.employeeName}</div>
          </div>
          <div className="esr-header-cell">
            <div className="cell-label">LOCATION</div>
            <div className="cell-value">{profile.location}</div>
          </div>
        </div>

        <div className="esr-header-grid">
          <div className="esr-header-cell">
            <div className="cell-label">DEPARTMENT</div>
            <div className="cell-value">{profile.department}</div>
          </div>
          <div className="esr-header-cell">
            <div className="cell-label">JOB TITLE</div>
            <div className="cell-value">{profile.jobTitle}</div>
          </div>
          <div className="esr-header-cell">
            <div className="cell-label">PAYSCALE DESCRIPTION</div>
            <div className="cell-value">Non Review Body {profile.band}</div>
          </div>
        </div>

        {/* NHS Logo & Salary/Wage line */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 1fr 1fr 1.2fr',
            border: '1px solid #000000',
            borderTop: 'none',
          }}
        >
          <div className="esr-logo-box">NHS</div>
          <div className="esr-header-cell" style={{ borderTop: 'none', borderBottom: 'none' }}>
            <div className="cell-label">FULL SALARY</div>
            <div className="cell-value tabular-nums">
              {formatCurrency(profile.fullTimeSalaryFte)}
            </div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none', borderBottom: 'none' }}>
            <div className="cell-label">STANDARD HRS.</div>
            <div className="cell-value tabular-nums">
              {profile.contractedWeeklyHours.toFixed(1)}
            </div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none', borderBottom: 'none' }}>
            <div className="cell-label">PT SALARY/WAGE</div>
            <div className="cell-value tabular-nums">
              {formatCurrency(summary.annualProRataSalary)}
            </div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none', borderBottom: 'none' }}>
            <div className="cell-label">EMPLOYEE NO.</div>
            <div className="cell-value tabular-nums">{profile.employeeNumber}</div>
          </div>
        </div>

        {/* Tax Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1.2fr 1.2fr',
            border: '1px solid #000000',
            borderTop: 'none',
          }}
        >
          <div className="esr-header-cell" style={{ borderTop: 'none' }}>
            <div className="cell-label">TAX OFFICE NAME</div>
            <div className="cell-value">{profile.taxOfficeName}</div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none' }}>
            <div className="cell-label">TAX OFFICE REF</div>
            <div className="cell-value">{profile.taxOfficeRef}</div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none' }}>
            <div className="cell-label">TAX CODE</div>
            <div className="cell-value">{profile.taxCode}</div>
          </div>
          <div className="esr-header-cell" style={{ borderTop: 'none' }}>
            <div className="cell-label">NI NUMBER</div>
            <div className="cell-value">{profile.niNumber}</div>
          </div>
        </div>

        {/* Two Columns: Pay & Allowances vs Deductions */}
        <div className="esr-columns-container">
          {/* Left Column: PAY AND ALLOWANCES */}
          <div className="esr-column-left">
            <div className="esr-table-header">PAY AND ALLOWANCES (+ = MINUS AMOUNT)</div>
            <table className="esr-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '40%' }}>
                    DESCRIPTION
                  </th>
                  <th className="text-right">HRS/DAYS</th>
                  <th className="text-right">PAID/DUE</th>
                  <th className="text-right">RATE</th>
                  <th className="text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {summary.payLineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{item.description}</td>
                    <td className="text-right tabular-nums">{item.unitsWorked.toFixed(2)}</td>
                    <td className="text-right tabular-nums">{item.paidUnits.toFixed(2)}</td>
                    <td className="text-right tabular-nums">{item.rate.toFixed(4)}</td>
                    <td className="text-right tabular-nums font-bold">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: DEDUCTIONS */}
          <div className="esr-column-right">
            <div className="esr-table-header">DEDUCTIONS (- INDICATES REFUND)</div>
            <table className="esr-table">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '55%' }}>
                    DESCRIPTION
                  </th>
                  <th className="text-right">AMOUNT</th>
                  <th className="text-right">BALANCE OF</th>
                </tr>
              </thead>
              <tbody>
                {summary.deductionsList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="text-left">{item.name}</td>
                    <td className="text-right tabular-nums font-bold">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="text-right tabular-nums">{item.balanceOrDetails || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary & Net Pay Section */}
        <div className="esr-summary-grid">
          {/* Left Summary Box: YTD Balances */}
          <div className="esr-ytd-box">
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '0.6875rem',
                borderBottom: '1px solid #000',
                paddingBottom: '2px',
                marginBottom: '4px',
              }}
            >
              Year To Date Balances (This Employment Only)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.25rem',
                fontSize: '0.6875rem',
              }}
            >
              <div>
                <span style={{ color: '#555' }}>GROSS PAY: </span>
                <span className="tabular-nums font-bold">
                  {formatCurrency(summary.grossPay * 4)}
                </span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TAXABLE PAY: </span>
                <span className="tabular-nums">{formatCurrency(summary.taxablePay * 4)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TAX PAID: </span>
                <span className="tabular-nums">{formatCurrency(summary.grossPay * 0.15 * 4)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>NI LETTER: </span>
                <span className="font-bold">{profile.niCategory}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>NI PAY: </span>
                <span className="tabular-nums">{formatCurrency(summary.grossPay * 4)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>NI CONTS: </span>
                <span className="tabular-nums">{formatCurrency(summary.grossPay * 0.05 * 4)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>PENSIONABLE: </span>
                <span className="tabular-nums">{formatCurrency(summary.pensionablePay * 4)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>PENSION CONTS: </span>
                <span className="tabular-nums">
                  {formatCurrency(summary.grossPay * profile.pensionContributionRate * 4)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Summary Box: This Period Summary */}
          <div className="esr-period-summary-box">
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '0.6875rem',
                borderBottom: '1px solid #000',
                paddingBottom: '2px',
                marginBottom: '4px',
              }}
            >
              This Period Summary
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.25rem',
                fontSize: '0.6875rem',
              }}
            >
              <div>
                <span style={{ color: '#555' }}>PENSIONABLE: </span>
                <span className="tabular-nums">{formatCurrency(summary.pensionablePay)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TAXABLE PAY: </span>
                <span className="tabular-nums">{formatCurrency(summary.taxablePay)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TAX PERIOD: </span>
                <span className="tabular-nums">{summary.taxPeriod}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>FREQUENCY: </span>
                <span>Monthly</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TOTAL PAYMENTS: </span>
                <span className="tabular-nums font-bold">{formatCurrency(summary.grossPay)}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>PERIOD END DATE: </span>
                <span>{summary.periodEndDate}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>TOTAL DEDUCTIONS: </span>
                <span className="tabular-nums font-bold">
                  {formatCurrency(summary.totalDeductions)}
                </span>
              </div>
              <div>
                <span style={{ color: '#555' }}>PAY DATE: </span>
                <span>{summary.payDate}</span>
              </div>
              <div>
                <span style={{ color: '#555' }}>PAY METHOD: </span>
                <span>{profile.payMethod}</span>
              </div>
            </div>

            {/* Prominent NET PAY Banner */}
            <div className="esr-net-pay-banner">
              <div className="esr-net-pay-title">NET PAY</div>
              <div className="esr-net-pay-val tabular-nums">£{formatCurrency(summary.netPay)}</div>
            </div>
          </div>
        </div>

        {/* Employer Messages box */}
        <div
          style={{
            border: '1px solid #000000',
            borderTop: 'none',
            padding: '0.6rem 0.85rem',
            fontSize: '0.6875rem',
            color: '#333333',
            background: '#fafafa',
          }}
        >
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
            MESSAGES FROM EMPLOYER
          </div>
          <div>
            Staff are encouraged to check that their personal details, held by their GP practice
            (first name, surname, address and postcode) match their Electronic Staff Record (ESR)
            details.
          </div>
        </div>
      </div>
    </div>
  );
};
