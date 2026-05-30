import React, { useState } from 'react';
import { pb } from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function LoginView() {
  useDocumentTitle('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await pb.collection('users').authWithPassword(email.trim().toLowerCase(), password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResetSuccess('');

    try {
      await pb.collection('users').requestPasswordReset(email.trim().toLowerCase());
      setResetSuccess('A password reset link has been sent to your email.');
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', padding: 'var(--space-md)', backgroundColor: 'var(--bg)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(400px, calc(100vw - 32px))' }}>
        <h1 className="text-display" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          {isForgotMode ? 'Reset Password' : 'Login'}
        </h1>

        {isForgotMode ? (
          <form onSubmit={handleRequestReset} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <p className="text-muted text-sm" style={{ margin: 0, textAlign: 'center' }}>
              Enter your email address and we'll send you a custom link to reset your password.
            </p>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                placeholder="e.g. singer@choir.org"
              />
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
            {resetSuccess && <p className="text-xs" style={{ color: 'var(--primary)', margin: 0, fontWeight: '600' }}>{resetSuccess}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-xs)' }}
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'center', textDecoration: 'underline', cursor: 'pointer', height: 'auto', padding: 0 }}
              onClick={() => {
                setIsForgotMode(false);
                setError('');
                setResetSuccess('');
              }}
            >
              ← Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                placeholder="e.g. singer@choir.org"
              />
            </div>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="text-label">Password</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: 0,
                    height: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setIsForgotMode(true);
                    setError('');
                    setResetSuccess('');
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-md)' }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}
      </AppCard>
    </div>
  );
}
