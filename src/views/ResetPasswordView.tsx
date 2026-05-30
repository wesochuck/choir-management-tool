import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ResetPasswordView() {
  useDocumentTitle('Reset Password');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing or invalid. Please request a new link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await pb.collection('users').confirmPasswordReset(token, password, confirmPassword);
      setSuccess('Your password has been successfully reset! Redirecting to login in 3 seconds...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. The link may have expired or is invalid.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100vw', padding: 'var(--space-md)', backgroundColor: 'var(--bg)' }}>
      <AppCard style={{ width: '100%', maxWidth: 'min(400px, calc(100vw - 32px))' }}>
        <h1 className="text-display" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>Reset Password</h1>

        {!token ? (
          <div className="flex-col" style={{ gap: 'var(--space-md)', alignItems: 'center', textAlign: 'center' }}>
            <p className="text-sm" style={{ color: 'var(--color-danger-text)', margin: 0 }}>
              ⚠️ Missing or invalid password reset token.
            </p>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              The reset link you followed is invalid or has expired. Please go back to the login screen and request a new password reset link.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-sm)' }}
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <p className="text-muted text-sm" style={{ margin: 0, textAlign: 'center' }}>
              Please enter your new password below. It must be at least 8 characters.
            </p>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                disabled={isLoading || !!success}
              />
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="card"
                style={{ padding: '0 12px', height: '44px', width: '100%', border: '1px solid var(--border)' }}
                disabled={isLoading || !!success}
              />
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--color-danger-text)', margin: 0 }}>{error}</p>}
            {success && <p className="text-xs" style={{ color: 'var(--primary)', margin: 0, fontWeight: '600' }}>{success}</p>}

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-md)' }}
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </button>

            {!success && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'center', textDecoration: 'underline', cursor: 'pointer', height: 'auto', padding: 0 }}
                onClick={() => navigate('/login')}
              >
                Cancel and return to Login
              </button>
            )}
          </form>
        )}
      </AppCard>
    </div>
  );
}
