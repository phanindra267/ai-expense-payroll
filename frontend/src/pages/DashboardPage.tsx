import React from 'react';
import { useGetDashboardQuery } from '../features/dashboard/dashboardApi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PIE_COLORS = ['#6366f1','#8b5cf6','#06d6a0','#f59e0b','#ef4444','#3b82f6','#ec4899'];

const HealthRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 54; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div className="health-ring">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="score-text">
        <div className="score-num" style={{ color }}>{score}</div>
        <div className="score-label">Health</div>
      </div>
    </div>
  );
};

const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}`;

const DashboardPage: React.FC = () => {
  const { data, isLoading } = useGetDashboardQuery();

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;

  const s = data?.summary || {};
  const trend = data?.trend || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const alerts = data?.alerts || [];
  const anomalies = data?.recentAnomalies || [];

  return (
    <div>
      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Monthly Expenses</div>
          <div className="value">{fmt(s.totalExpenses)}</div>
          <div className="sub">{s.expenseCount} transactions</div>
          <div className="icon" style={{ background: 'rgba(99,102,241,0.15)' }}>💳</div>
        </div>
        <div className="stat-card">
          <div className="label">Payroll Cost</div>
          <div className="value">{fmt(s.payrollCost)}</div>
          <div className="sub">Current month</div>
          <div className="icon" style={{ background: 'rgba(6,214,160,0.15)' }}>💰</div>
        </div>
        <div className="stat-card">
          <div className="label">Active Alerts</div>
          <div className="value" style={{ color: s.activeAlerts > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>{s.activeAlerts}</div>
          <div className="sub">{s.activeAlerts === 0 ? 'All clear' : 'Requires attention'}</div>
          <div className="icon" style={{ background: 'rgba(245,158,11,0.15)' }}>🔔</div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div>
            <div className="label">Financial Health</div>
            <div className="sub" style={{ marginTop: 4 }}>{s.healthScore >= 80 ? '✅ Healthy' : s.healthScore >= 60 ? '⚠️ Moderate Risk' : '🚨 High Risk'}</div>
          </div>
          <HealthRing score={s.healthScore ?? 100} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Trend */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Expense Trend — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8 }} formatter={(v: any) => [fmt(v), 'Total']} />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fill="url(#gradExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Category Breakdown</h3>
          {categoryBreakdown.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No expense data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                  {categoryBreakdown.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 8 }} formatter={(v: any) => [fmt(v), 'Spent']} />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alerts & Anomalies */}
      <div className="grid-2">
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>🔔 Active Alerts</h3>
          {alerts.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active alerts — you're good! ✅</p>
          : alerts.slice(0, 5).map((a: any) => (
            <div key={a._id} className={`alert-item ${a.type === 'budget_critical' ? 'critical' : a.type === 'budget_warning' ? 'warning' : 'anomaly'}`}>
              <span>{a.type === 'budget_critical' ? '🚨' : a.type === 'budget_warning' ? '⚠️' : '🔍'}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>🚨 Recent Anomalies</h3>
          {anomalies.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No anomalies detected recently ✅</p>
          : anomalies.map((e: any) => (
            <div key={e._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{e.description}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{e.category} • {new Date(e.date).toLocaleDateString()}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-danger)', whiteSpace: 'nowrap' }}>₹{e.amount?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
