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
    <div className="public-page public-page--default">
      <AppCard className="public-content-narrow">
        <h1 className="text-display public-heading-center">Reset Password</h1>

        {!token ? (
          <div className="public-error-body">
            <p className="public-form-error">
              ⚠️ Missing or invalid password reset token.
            </p>
            <p className="text-muted text-xs public-heading-reset">
              The reset link you followed is invalid or has expired. Please go back to the login screen and request a new password reset link.
            </p>
            <Button
              variant="primary"
              className="public-submit-btn public-margin-top-sm"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="public-form">
            <p className="login-instructions">
              Please enter your new password below. It must be at least 8 characters.
            </p>

            <FormField label="New Password" htmlFor="new-password">
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="public-form-input"
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
                className="public-form-input"
                disabled={isLoading || !!success}
              />
            </FormField>

            {error && <p className="public-form-error">{error}</p>}
            {success && <p className="public-form-success">{success}</p>}

            <Button
              type="submit"
              disabled={isLoading || !!success}
              variant="primary"
              size="small"
              className="public-submit-btn--md"
            >
              {isLoading ? 'Resetting password...' : 'Reset Password'}
            </Button>

            {!success && (
              <Button
                variant="ghost"
                className="public-back-link"
                onClick={() => navigate('/login')}
              >
                Cancel and return to Login
              </Button>
            )}
          </form>
        )}
      </AppCard>
    </div>
  );
}
