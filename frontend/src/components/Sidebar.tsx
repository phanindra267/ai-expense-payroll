import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { logout } from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';
import { disconnectSocket } from '../app/socket';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/expenses',  icon: '💳', label: 'Expenses' },
  { to: '/employees', icon: '👥', label: 'Employees' },
  { to: '/payroll',   icon: '💰', label: 'Payroll' },
  { to: '/budgets',   icon: '🎯', label: 'Budgets' },
  { to: '/reports',   icon: '📈', label: 'Reports' },
  { to: '/ai',        icon: '🤖', label: 'AI Assistant' },
];

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const refreshToken = useSelector((s: RootState) => s.auth.refreshToken);
  const [doLogout] = useLogoutMutation();

  const handleLogout = async () => {
    try { await doLogout({ refreshToken: refreshToken! }); } catch {}
    disconnectSocket();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>⚡ FinAI</h1>
        <p>Enterprise Finance Suite</p>
      </div>

      <nav className="nav-section">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.email}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
