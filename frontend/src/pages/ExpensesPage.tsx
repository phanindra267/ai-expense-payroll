import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useListExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation } from '../features/expenses/expenseApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { v4 as uuidv4 } from 'uuid';

const CATEGORIES = ['Travel & Accommodation','Transport','Meals & Entertainment','Software & Subscriptions','Office Supplies','Payroll','Taxes & Duties','Marketing','Legal & Compliance','Healthcare','General'];

const ExpensesPage: React.FC = () => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', date: '', vendor: '', category: '', paymentMethod: '' });
  const [receipt, setReceipt] = useState<File | null>(null);

  const { data, isLoading } = useListExpensesQuery(filters);
  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (receipt) fd.append('receipt', receipt);
    try {
      await createExpense(fd).unwrap();
      toast.success('Expense added & queued for AI categorisation');
      setShowAdd(false);
      setForm({ description: '', amount: '', date: '', vendor: '', category: '', paymentMethod: '' });
    } catch (err: any) { toast.error(err?.data?.message || 'Failed to create expense'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await deleteExpense(id).unwrap(); toast.success('Deleted'); } catch { toast.error('Delete failed'); }
  };

  const columns = [
    { key: 'date', label: 'Date', render: (r: any) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'description', label: 'Description', render: (r: any) => <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.description}</span> },
    { key: 'vendor', label: 'Vendor' },
    { key: 'category', label: 'Category', render: (r: any) => <span className="badge badge-info">{r.category}</span> },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'amount', label: 'Amount', render: (r: any) => <span style={{ fontWeight: 700, color: 'var(--color-accent2)' }}>₹{r.amount?.toLocaleString('en-IN')}</span> },
    { key: 'flagged', label: 'Status', render: (r: any) => r.flagged ? <span className="badge badge-danger">⚠ Anomaly</span> : <span className="badge badge-success">Normal</span> },
    { key: 'actions', label: '', render: (r: any) => <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>Delete</button> },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h2>Expenses</h2><p>Track, categorise and audit all business expenses</p></div>
        <button id="add-expense-btn" className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input type="month" className="form-input" style={{ width: 180 }} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))} />
        <select className="form-select" onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-select" onChange={e => setFilters(f => ({ ...f, flagged: e.target.value }))}>
          <option value="">All Status</option>
          <option value="true">Flagged</option>
          <option value="false">Normal</option>
        </select>
      </div>

      <div className="card">
        <DataTable columns={columns} data={data?.data || []} loading={isLoading} emptyMessage="No expenses found. Add your first expense!" />
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input className="form-input" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Team lunch at The Grand" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input type="number" className="form-input" required step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Vendor</label>
              <input className="form-input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">AI will categorise</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-select" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
              <option value="">Select method</option>
              {['Cash','Credit Card','Debit Card','UPI','Net Banking','Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Receipt (optional)</label>
            <input type="file" className="form-input" accept="image/*,application/pdf" onChange={e => setReceipt(e.target.files?.[0] || null)} style={{ padding: '8px 12px' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ flex: 1 }}>{creating ? 'Adding...' : '✓ Add Expense'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
