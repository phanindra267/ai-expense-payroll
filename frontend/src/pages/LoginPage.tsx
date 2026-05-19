import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useLoginMutation } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import { initSocket } from '../app/socket';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await login(form).unwrap();
      dispatch(setCredentials(res));
      initSocket(res.accessToken);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%), var(--bg-base)' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
          <h1 style={{ background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FinAI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Enterprise Expense & Payroll Management</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.3rem' }}>Sign in</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28 }}>Enter your credentials to access your dashboard</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="email" type="email" className="form-input" placeholder="you@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="password" type="password" className="form-input" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div style={{ textAlign: 'right', marginTop: -10 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Forgot password?</Link>
            </div>
            <button id="login-btn" type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', justifyContent: 'center' }}>
              {isLoading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Create organisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
