import { useState, useEffect } from 'react';
import { useSetup } from '../../../contexts/SetupContext';
import { pb } from '../../../lib/pocketbase';
import { Button } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';

interface HealthData {
  environment: {
    appUrl: boolean;
    hmacSecret: boolean;
    maintenanceSecret: boolean;
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
  };
  stripeMode: string;
  stripeValid: boolean | null;
  appUrlMismatch: boolean;
  emailValid: boolean;
}

interface IntegrationVerificationStepProps {
  onSuccess: () => void;
}

export function IntegrationVerificationStep({ onSuccess }: IntegrationVerificationStepProps) {
  const { enabledModules } = useSetup();
  const dialog = useDialog();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await pb.send('/api/setup/health', { method: 'GET' });
      setHealth(res as HealthData);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
    // Default test email to current user email
    if (pb.authStore.model?.email) {
      setTestEmail(pb.authStore.model.email);
    }
  }, []);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setSendingEmail(true);
    try {
      await pb.send('/api/test-smtp', {
        method: 'POST',
        body: { email: testEmail },
      });
      dialog.showToast('Test email sent successfully! Check your inbox.');
      // Refetch health to update emailValid checkmark
      await fetchHealth();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void dialog.showMessage({
        title: 'Email Test Failed',
        message: msg || 'Please verify your SMTP settings in Settings page.',
        variant: 'danger',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading || !health) {
    return <div className="text-sm text-slate-400">Loading integration status...</div>;
  }

  const isTicketSalesEnabled = enabledModules.has('ticketSales');

  // Secrets: hmacSecret and maintenanceSecret must be true
  const secretsValid = health.environment.hmacSecret && health.environment.maintenanceSecret;

  // App URL: appUrl must be true and not mismatched
  const appUrlValid = health.environment.appUrl && !health.appUrlMismatch;

  // Stripe validation: if ticket sales is enabled, stripeSecretKey must be present and valid
  const stripeRequired = isTicketSalesEnabled;
  const stripeValid =
    !stripeRequired || (health.environment.stripeSecretKey && health.stripeValid === true);

  // Email verification checkmark
  const emailValid = health.emailValid;

  // Overall readiness for this step
  const isReady = true;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Verification & Integration</h3>
        <p className="mt-1 text-sm text-slate-400">
          Verify that your environment parameters and backend services are communicating correctly.
        </p>
      </div>

      {/* Checklist items */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Integration Checklist
        </h4>

        {/* Secrets */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 py-2 pb-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Secrets (HMAC & Maintenance)</span>
            <span className="mt-0.5 text-xs text-slate-400">
              {!health.environment.hmacSecret && 'Missing HMAC_SECRET. '}
              {!health.environment.maintenanceSecret && 'Missing MAINTENANCE_SECRET. '}
              {secretsValid && 'Cryptographic and maintenance secrets are properly loaded.'}
            </span>
          </div>
          <span className="text-lg" role="img" aria-label={secretsValid ? 'check' : 'cross'}>
            {secretsValid ? '✅' : '❌'}
          </span>
        </div>

        {/* App URL */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 py-2 pb-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Application Environment URL</span>
            <span className="mt-0.5 text-xs text-slate-400">
              {!health.environment.appUrl && 'Missing APP_URL environment variable.'}
              {health.appUrlMismatch && 'APP_URL host does not match the active request host.'}
              {appUrlValid && 'APP_URL matches current request origin.'}
            </span>
          </div>
          <span className="text-lg" role="img" aria-label={appUrlValid ? 'check' : 'cross'}>
            {appUrlValid ? '✅' : '❌'}
          </span>
        </div>

        {/* Stripe (Ticketing) */}
        {isTicketSalesEnabled && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-800/60 py-2 pb-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">
                Stripe Credentials ({health.stripeMode} mode)
              </span>
              <span className="mt-0.5 text-xs text-slate-400">
                {!health.environment.stripeSecretKey && 'Missing STRIPE_SECRET_KEY. '}
                {health.environment.stripeSecretKey &&
                  health.stripeValid !== true &&
                  'Invalid STRIPE_SECRET_KEY. Please verify in stripe dashboard.'}
                {health.environment.stripeSecretKey &&
                  health.stripeValid === true &&
                  'Stripe API key is active and successfully validated.'}
              </span>
            </div>
            <span className="text-lg" role="img" aria-label={stripeValid ? 'check' : 'cross'}>
              {stripeValid ? '✅' : '❌'}
            </span>
          </div>
        )}

        {/* Email Integration */}
        <div className="flex items-start justify-between gap-4 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Email SMTP/Brevo Server</span>
            <span className="mt-0.5 text-xs text-slate-400">
              {emailValid
                ? 'Outgoing mail server verified successfully.'
                : 'Send a successful test email below to verify outgoing mail server.'}
            </span>
          </div>
          <span className="text-lg" role="img" aria-label={emailValid ? 'check' : 'cross'}>
            {emailValid ? '✅' : '❌'}
          </span>
        </div>
      </div>

      {/* Test Email Box */}
      <form
        onSubmit={handleTestEmail}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/20 p-6"
      >
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Send Test Email</h4>
          <p className="mt-1 text-xs text-slate-400">
            Dispatch a test email to verify SMTP credentials and settings validity.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 outline-none focus:border-teal-500"
          />
          <Button type="submit" loading={sendingEmail} disabled={sendingEmail}>
            Send Test
          </Button>
        </div>
      </form>

      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={fetchHealth} variant="secondary">
          Refresh Status
        </Button>
        <Button onClick={onSuccess} disabled={!isReady}>
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
