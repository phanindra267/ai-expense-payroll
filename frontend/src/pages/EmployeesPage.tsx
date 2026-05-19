import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useListEmployeesQuery, useCreateEmployeeMutation, useDeleteEmployeeMutation, useAddAdjustmentMutation } from '../features/employees/employeeApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';

const EmployeesPage: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [showAdj, setShowAdj] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', department: '', baseSalary: '', joiningDate: '' });
  const [adj, setAdj] = useState({ month: '', type: 'bonus', amount: '', reason: '' });

  const { data, isLoading } = useListEmployeesQuery({});
  const [create, { isLoading: creating }] = useCreateEmployeeMutation();
  const [remove] = useDeleteEmployeeMutation();
  const [addAdj, { isLoading: addingAdj }] = useAddAdjustmentMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create({ ...form, baseSalary: parseFloat(form.baseSalary) }).unwrap();
      toast.success('Employee created');
      setShowAdd(false);
      setForm({ name: '', email: '', department: '', baseSalary: '', joiningDate: '' });
    } catch (err: any) { toast.error(err?.data?.message || 'Failed'); }
  };

  const handleAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdj) return;
    try {
      await addAdj({ id: showAdj, data: { ...adj, amount: parseFloat(adj.amount) } }).unwrap();
      toast.success('Adjustment added');
      setShowAdj(null);
      setAdj({ month: '', type: 'bonus', amount: '', reason: '' });
    } catch (err: any) { toast.error(err?.data?.message || 'Failed'); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department', render: (r: any) => <span className="badge badge-info">{r.department}</span> },
    { key: 'baseSalary', label: 'Base Salary', render: (r: any) => <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{r.baseSalary?.toLocaleString('en-IN')}</span> },
    { key: 'joiningDate', label: 'Joining Date', render: (r: any) => r.joiningDate ? new Date(r.joiningDate).toLocaleDateString('en-IN') : '—' },
    { key: 'actions', label: '', render: (r: any) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdj(r._id)}>+ Adjustment</button>
        <button className="btn btn-danger btn-sm" onClick={async () => { if(window.confirm('Delete?')) { try { await remove(r._id).unwrap(); toast.success('Deleted'); } catch { toast.error('Failed'); } } }}>Delete</button>
      </div>
    )},
  ];

  return (
    <div>
      <div className="page-header">
        <div><h2>Employees</h2><p>Manage your workforce and salary adjustments</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Employee</button>
      </div>

      <div className="card">
        <DataTable columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No employees yet. Add your first team member!" />
      </div>

      {/* Add Employee Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Employee">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[['name','Name *','text','John Doe'],['email','Email *','email','john@company.com'],['department','Department *','text','Engineering'],['baseSalary','Base Salary (₹) *','number','50000'],['joiningDate','Joining Date','date','']].map(([k,l,t,ph]) => (
            <div key={k} className="form-group">
              <label className="form-label">{l}</label>
              <input type={t} className="form-input" placeholder={ph} value={(form as any)[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} required={l.includes('*')} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>{creating ? 'Creating...' : '✓ Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Adjustment Modal */}
      <Modal isOpen={!!showAdj} onClose={() => setShowAdj(null)} title="Add Monthly Adjustment">
        <form onSubmit={handleAdj} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Month (YYYY-MM) *</label>
            <input type="month" className="form-input" required value={adj.month} onChange={e => setAdj(a => ({ ...a, month: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="form-select" value={adj.type} onChange={e => setAdj(a => ({ ...a, type: e.target.value }))}>
              {['bonus','deduction','overtime','leave'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input type="number" className="form-input" required step="0.01" value={adj.amount} onChange={e => setAdj(a => ({ ...a, amount: e.target.value }))} placeholder="5000" />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <input className="form-input" value={adj.reason} onChange={e => setAdj(a => ({ ...a, reason: e.target.value }))} placeholder="Performance bonus Q1" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdj(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={addingAdj}>{addingAdj ? 'Adding...' : '✓ Add'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
