import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

const ReportsPage: React.FC = () => {
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const download = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  const monthlyUrl = `/api/reports/monthly?month=${month}`;
  const yearlyUrl = `/api/reports/yearly?year=${year}`;

  return (
    <div>
      <div className="page-header">
        <div><h2>Reports</h2><p>Export expense data as CSV for accounting and auditing</p></div>
      </div>

      <div className="grid-2">
        {/* Monthly Report */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>📅</div>
          <h3 style={{ marginBottom: 8 }}>Monthly Expense Report</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            Download all expenses for a specific month as a CSV file including date, description, vendor, category, amount, and anomaly flags.
          </p>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Month *</label>
            <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <button
            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            disabled={!month}
            onClick={() => {
              fetch(monthlyUrl, { headers: { authorization: `Bearer ${token}` } })
                .then(r => r.blob()).then(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `expenses-${month}.csv`; a.click();
                });
            }}
          >
            ⬇ Download Monthly CSV
          </button>
        </div>

        {/* Yearly Report */}
        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>📊</div>
          <h3 style={{ marginBottom: 8 }}>Yearly Expense Report</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            Download all expenses for an entire financial year as a CSV file with monthly groupings for trend analysis.
          </p>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Year *</label>
            <select className="form-select" value={year} onChange={e => setYear(e.target.value)}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              fetch(yearlyUrl, { headers: { authorization: `Bearer ${token}` } })
                .then(r => r.blob()).then(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `expenses-${year}.csv`; a.click();
                });
            }}
          >
            ⬇ Download Yearly CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
