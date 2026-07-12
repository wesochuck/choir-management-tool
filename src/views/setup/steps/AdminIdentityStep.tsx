import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import { Input, FormField, Checkbox } from '../../../components/ui';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { setupService } from '../../../services/setupService';

interface AdminIdentityStepProps {
  initialEmail?: string;
  initialPassword?: string;
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
}

export const AdminIdentityStep: React.FC<AdminIdentityStepProps> = ({
  initialEmail = '',
  initialPassword = '',
  onSuccess,
  refreshStatus,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [passwordConfirm, setPasswordConfirm] = useState(initialPassword);
  const [isPerformer, setIsPerformer] = useState(false);
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleSubmit = async (e: React.FormEvent) => {
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
      await setupService.claim({
        email,
        password,
        passwordConfirm,
        name,
        isPerformer,
      });

      pb.authStore.clear();

      await pb.collection('users').authWithPassword(email, password);

      await refreshStatus();

      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Setup Error',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    name.trim() !== '' && email.trim() !== '' && password !== '' && passwordConfirm !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Create your primary administrative owner account. This account will have full access to
          manage the organization.
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

        <Checkbox checked={isPerformer} onChange={(e) => setIsPerformer(e.target.checked)}>
          I am also a performer (singer) in this choir
        </Checkbox>
      </div>

      <SetupNavigation
        nextLabel="Create Admin Account"
        nextDisabled={!isFormValid}
        loading={loading}
      />
    </form>
  );
};
