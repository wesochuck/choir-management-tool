import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import { Input, FormField } from '../../../components/ui';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { setupService } from '../../../services/setupService';

interface AdminRecoveryStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
}

export const AdminRecoveryStep: React.FC<AdminRecoveryStepProps> = ({
  onSuccess,
  refreshStatus,
}) => {
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleSuperuserAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suEmail || !suPassword) return;

    setLoading(true);
    try {
      await pb.collection('_superusers').authWithPassword(suEmail, suPassword);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Authentication Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !passwordConfirm) return;

    if (password !== passwordConfirm) {
      void dialog.showMessage({
        title: 'Error',
        message: 'Passwords do not match.',
        variant: 'danger',
      });
      return;
    }

    setLoading(true);
    try {
      await setupService.recoverAdmin({
        email,
        password,
        passwordConfirm,
        name,
      });

      pb.authStore.clear();

      await pb.collection('users').authWithPassword(email, password);

      await refreshStatus();

      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Recovery Error',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <form onSubmit={handleSuperuserAuth} className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Authorization required: Enter superuser credentials to recover or create an
            administrator account.
          </p>

          <FormField label="Superuser Email" required>
            <Input
              type="email"
              value={suEmail}
              onChange={(e) => setSuEmail(e.target.value)}
              placeholder="superuser@example.com"
              disabled={loading}
              required
              autoComplete="email"
            />
          </FormField>

          <FormField label="Superuser Password" required>
            <Input
              type="password"
              value={suPassword}
              onChange={(e) => setSuPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
              autoComplete="current-password"
            />
          </FormField>
        </div>

        <SetupNavigation
          nextLabel="Authorize Recovery"
          nextDisabled={!suEmail || !suPassword}
          loading={loading}
        />
      </form>
    );
  }

  const isFormValid =
    name.trim() !== '' && email.trim() !== '' && password !== '' && passwordConfirm !== '';

  return (
    <form onSubmit={handleRecoverySubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Superuser authorized. Set up the new primary administrative owner account.
        </p>

        <FormField label="Full Name" required>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            disabled={loading}
            required
            autoComplete="name"
          />
        </FormField>

        <FormField label="Admin Email Address" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@organization.org"
            disabled={loading}
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirm Password" required>
          <Input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            autoComplete="new-password"
          />
        </FormField>
      </div>

      <SetupNavigation
        nextLabel="Restore Admin Access"
        nextDisabled={!isFormValid}
        loading={loading}
      />
    </form>
  );
};
