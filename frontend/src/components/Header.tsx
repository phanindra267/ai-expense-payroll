import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/expenses':  'Expenses',
  '/employees': 'Employees',
  '/payroll':   'Payroll',
  '/budgets':   'Budgets',
  '/reports':   'Reports',
  '/ai':        'AI Assistant',
};

const Header: React.FC = () => {
  const location = useLocation();
  const user = useSelector((s: RootState) => s.auth.user);
  const title = titles[location.pathname] || 'FinAI';

  return (
    <header className="header">
      <div>
        <div className="header-title">{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
      <div className="header-actions">
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{user?.email}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
        <div className="avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
      </div>
    </header>
  );
};

export default Header;
