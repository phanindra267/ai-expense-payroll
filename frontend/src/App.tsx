import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './app/store';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const LoginPage    = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpensesPage  = lazy(() => import('./pages/ExpensesPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const PayrollPage   = lazy(() => import('./pages/PayrollPage'));
const BudgetsPage   = lazy(() => import('./pages/BudgetsPage'));
const ReportsPage   = lazy(() => import('./pages/ReportsPage'));
const AIChatPage    = lazy(() => import('./pages/AIChatPage'));

const Loading = () => (
  <div className="loading-center" style={{ minHeight: '100vh' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
    </div>
  </div>
);

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <Header />
      <main className="page-content">
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </main>
    </div>
  </div>
);

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = useSelector((s: RootState) => s.auth.isAuthenticated);
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
};

const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = useSelector((s: RootState) => s.auth.isAuthenticated);
  return isAuth ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const App: React.FC = () => (
  <Suspense fallback={<Loading />}>
    <Routes>
      {/* Guest routes */}
      <Route path="/login"    element={<GuestGuard><LoginPage /></GuestGuard>} />
      <Route path="/register" element={<GuestGuard><RegisterPage /></GuestGuard>} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<AuthGuard><PrivateLayout><DashboardPage /></PrivateLayout></AuthGuard>} />
      <Route path="/expenses"  element={<AuthGuard><PrivateLayout><ExpensesPage /></PrivateLayout></AuthGuard>} />
      <Route path="/employees" element={<AuthGuard><PrivateLayout><EmployeesPage /></PrivateLayout></AuthGuard>} />
      <Route path="/payroll"   element={<AuthGuard><PrivateLayout><PayrollPage /></PrivateLayout></AuthGuard>} />
      <Route path="/budgets"   element={<AuthGuard><PrivateLayout><BudgetsPage /></PrivateLayout></AuthGuard>} />
      <Route path="/reports"   element={<AuthGuard><PrivateLayout><ReportsPage /></PrivateLayout></AuthGuard>} />
      <Route path="/ai"        element={<AuthGuard><PrivateLayout><AIChatPage /></PrivateLayout></AuthGuard>} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default App;
