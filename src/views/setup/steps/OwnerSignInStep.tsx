import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import { Input, FormField } from '../../../components/ui';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';

interface OwnerSignInStepProps {
  onSuccess: (credentials: { email: string; pass: string }) => void;
}

export const OwnerSignInStep: React.FC<OwnerSignInStepProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await pb.collection('_superusers').authWithPassword(email, password);
      onSuccess({ email, pass: password });
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Sign In Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Enter the superuser credentials created during your PocketHost deployment to start
          first-run configuration.
        </p>

        <FormField label="Superuser Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="superuser@example.com"
            disabled={loading}
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Superuser Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            autoComplete="current-password"
          />
        </FormField>
      </div>

      <SetupNavigation nextLabel="Sign In" nextDisabled={!email || !password} loading={loading} />
    </form>
  );
};
