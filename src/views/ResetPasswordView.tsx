import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { AppCard } from '../components/common/AppCard';
import { Button } from '../components/ui/Button/Button';
import { Input } from '../components/ui/Input/Input';
import { FormField } from '../components/ui/FormField/FormField';
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
    <div className="flex flex-col min-h-screen w-screen items-center justify-center p-4 bg-bg">
      <AppCard className="w-full max-w-[min(400px,calc(100vw-32px))]">
        <h1 className="text-display text-center mb-8">Reset Password</h1>

        {!token ? (
          <div className="flex flex-col gap-4 items-center">
            <p className="text-danger-text text-xs m-0">
              ⚠️ Missing or invalid password reset token.
            </p>
            <p className="text-text-muted text-xs m-0">
              The reset link you followed is invalid or has expired. Please go back to the login screen and request a new password reset link.
            </p>
            <Button
              variant="primary"
              className="w-full mt-2"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <p className="m-0 text-center text-sm text-text-muted leading-relaxed">
              Please enter your new password below. It must be at least 8 characters.
            </p>

            <FormField label="New Password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                disabled={isLoading || !!success}
              />
            </FormField>

            <FormField label="Confirm Password" htmlFor="confirm-password">
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="px-3 h-11 w-full border border-border rounded-lg bg-surface text-text font-sans text-base transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(109,40,217,0.15)] focus:outline-none"
                disabled={isLoading || !!success}
              />
            </FormField>

            {error && <p className="text-danger-text text-xs m-0">{error}</p>}
            {success && <p className="text-primary text-xs font-semibold m-0">{success}</p>}

            <Button
              type="submit"
              disabled={isLoading || !!success}
              variant="primary"
              className="w-full mt-4"
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </Button>

            {!success && (
              <button
                type="button"
                className="self-center border-none bg-none underline cursor-pointer h-auto p-0 text-xs text-text-muted hover:text-text"
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
