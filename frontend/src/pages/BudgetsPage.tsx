import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useListBudgetsQuery, useSetBudgetMutation, useDeleteBudgetMutation } from '../features/budget/budgetApi';
import Modal from '../components/Modal';

const CATEGORIES = ['Travel & Accommodation','Transport','Meals & Entertainment','Software & Subscriptions','Office Supplies','Payroll','Taxes & Duties','Marketing','Legal & Compliance','Healthcare','General'];

const BudgetsPage: React.FC = () => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: '', month: '', limit: '' });

  const { data, isLoading } = useListBudgetsQuery({ month });
  const [setBudget, { isLoading: saving }] = useSetBudgetMutation();
  const [deleteBudget] = useDeleteBudgetMutation();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setBudget({ ...form, month: form.month || month, limit: parseFloat(form.limit) }).unwrap();
      toast.success('Budget saved');
      setShowAdd(false);
      setForm({ category: '', month: '', limit: '' });
    } catch (err: any) { toast.error(err?.data?.message || 'Failed'); }
  };

  const budgets: any[] = data || [];

  return (
    <div>
      <div className="page-header">
        <div><h2>Budgets</h2><p>Set and monitor category spending limits</p></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="month" className="form-input" value={month} onChange={e => setMonth(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Set Budget</button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="empty-state card" style={{ padding: 60 }}>
          <div className="emoji">🎯</div>
          <h3>No budgets for {month}</h3>
          <p>Set spending limits to track and control expenses by category</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowAdd(true)}>Set First Budget</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {budgets.map((b: any) => {
            const pct = b.percentUsed || 0;
            const barColor = pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-accent)';
            return (
              <div key={b._id} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{b.category}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{b.month}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${b.status === 'critical' ? 'badge-danger' : b.status === 'warning' ? 'badge-warning' : 'badge-success'}`}>
                      {b.status?.toUpperCase()}
                    </span>
                    <button className="btn btn-danger btn-sm" onClick={async () => { try { await deleteBudget(b._id).unwrap(); toast.success('Deleted'); } catch { toast.error('Failed'); } }}>✕</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 8, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>SPENT</div>
                    <div style={{ fontWeight: 700, color: barColor }}>₹{b.spentSoFar?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>USED</div>
                    <div style={{ fontWeight: 700, color: barColor }}>{pct}%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 2 }}>LIMIT</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{b.limit?.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Set Budget">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Month *</label>
            <input type="month" className="form-input" required value={form.month || month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Monthly Limit (₹) *</label>
            <input type="number" className="form-input" required step="100" min="0" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} placeholder="50000" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Saving...' : '✓ Save Budget'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BudgetsPage;
