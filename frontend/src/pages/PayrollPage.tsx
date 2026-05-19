import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useListPayrollsQuery, useProcessPayrollMutation, useUpdateStatusMutation } from '../features/payroll/payrollApi';
import DataTable from '../components/DataTable';

const STEPS = ['draft','audited','approved','paid'];
const STEP_NEXT: Record<string, string> = { draft: 'audited', audited: 'approved', approved: 'paid' };

const statusColor: Record<string, string> = {
  draft: 'badge-muted', audited: 'badge-info', approved: 'badge-warning', paid: 'badge-success',
};

const PayrollPage: React.FC = () => {
  const [month, setMonth] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const { data, isLoading } = useListPayrollsQuery(filterMonth ? { month: filterMonth } : {});
  const [process, { isLoading: processing }] = useProcessPayrollMutation();
  const [updateStatus, { isLoading: updating }] = useUpdateStatusMutation();

  const handleProcess = async () => {
    if (!month) { toast.error('Select a month first'); return; }
    try {
      const res = await process({ month }).unwrap();
      toast.success(`Processed payroll for ${res.count} employees`);
    } catch (err: any) { toast.error(err?.data?.message || 'Processing failed'); }
  };

  const handleAdvance = async (id: string, currentStatus: string) => {
    const next = STEP_NEXT[currentStatus];
    if (!next) return;
    try {
      await updateStatus({ id, status: next }).unwrap();
      toast.success(`Status updated to ${next}`);
    } catch (err: any) { toast.error(err?.data?.message || 'Update failed'); }
  };

  const handleSlip = (id: string) => {
    window.open(`/api/payroll/${id}/slip`, '_blank');
  };

  const columns = [
    { key: 'employee', label: 'Employee', render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.employeeId?.name || '—'}</span> },
    { key: 'dept', label: 'Dept', render: (r: any) => <span className="badge badge-info">{r.employeeId?.department || '—'}</span> },
    { key: 'month', label: 'Month' },
    { key: 'baseSalary', label: 'Base', render: (r: any) => `₹${r.baseSalary?.toLocaleString('en-IN')}` },
    { key: 'netPay', label: 'Net Pay', render: (r: any) => <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{r.netPay?.toLocaleString('en-IN')}</span> },
    { key: 'status', label: 'Status', render: (r: any) => <span className={`badge ${statusColor[r.status]}`}>{r.status?.toUpperCase()}</span> },
    { key: 'actions', label: '', render: (r: any) => (
      <div style={{ display: 'flex', gap: 6 }}>
        {STEP_NEXT[r.status] && (
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => handleAdvance(r._id, r.status)}
            disabled={updating}
          >
            {updating ? '⏳' : `→ ${STEP_NEXT[r.status]}`}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => handleSlip(r._id)}>📄 Slip</button>
      </div>
    )},
  ];

  // Status workflow steps indicator
  const stepCounts = STEPS.reduce((acc: Record<string, number>, s) => {
    acc[s] = (data || []).filter((p: any) => p.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div><h2>Payroll</h2><p>Process monthly payroll and track approval workflow</p></div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="month" className="form-input" style={{ width: 180 }} value={month} onChange={e => setMonth(e.target.value)} />
          <button className="btn btn-primary" onClick={handleProcess} disabled={processing}>
            {processing ? '⏳ Processing...' : '⚡ Process Payroll'}
          </button>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="card" style={{ padding: '20px 28px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Approval Workflow</div>
        <div className="status-steps">
          {STEPS.map((step, i) => (
            <div key={step} className="status-step">
              <div className={`step-dot ${stepCounts[step] > 0 ? 'active' : 'pending'}`}>{stepCounts[step]}</div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{step}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stepCounts[step]} records</div>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${stepCounts[step] > 0 ? 'done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input type="month" className="form-input" style={{ width: 180 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)} placeholder="Filter by month" />
        {filterMonth && <button className="btn btn-ghost btn-sm" onClick={() => setFilterMonth('')}>✕ Clear</button>}
      </div>

      <div className="card">
        <DataTable columns={columns} data={data || []} loading={isLoading} emptyMessage="No payroll records. Process a month to get started!" />
      </div>
    </div>
  );
};

export default PayrollPage;
