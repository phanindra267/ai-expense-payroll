import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useRegisterMutation } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import { initSocket } from '../app/socket';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [form, setForm] = useState({ orgName: '', email: '', password: '', confirm: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    try {
      const res = await register({ orgName: form.orgName, email: form.email, password: form.password }).unwrap();
      dispatch(setCredentials(res));
      initSocket(res.accessToken);
      toast.success('Organisation created! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.15) 0%, transparent 60%), var(--bg-base)' }}>
      <div style={{ width: '100%', maxWidth: 460, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚡</div>
          <h1 style={{ background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>FinAI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 6 }}>Create your organisation</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.3rem' }}>Get started</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28 }}>Set up your organisation and admin account</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Organisation Name</label>
              <input id="orgName" type="text" className="form-input" placeholder="Acme Corp" value={form.orgName}
                onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input id="reg-email" type="email" className="form-input" placeholder="admin@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="reg-password" type="password" className="form-input" placeholder="Min. 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input id="reg-confirm" type="password" className="form-input" placeholder="Repeat password" value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <button id="register-btn" type="submit" className="btn btn-primary btn-lg" disabled={isLoading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {isLoading ? '⏳ Creating...' : '🚀 Create Organisation'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
