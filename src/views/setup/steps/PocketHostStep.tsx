import { useState, useEffect } from 'react';
import { generateSecret } from '../../../lib/setupSecrets';
import { Button } from '../../../components/ui';

interface PocketHostStepProps {
  onSuccess: (secrets: { hmacSecret: string; maintenanceSecret: string }) => void;
}

export function PocketHostStep({ onSuccess }: PocketHostStepProps) {
  const [hmacSecret, setHmacSecret] = useState('');
  const [maintenanceSecret, setMaintenanceSecret] = useState('');
  const [copiedHmac, setCopiedHmac] = useState(false);
  const [copiedMaintenance, setCopiedMaintenance] = useState(false);

  useEffect(() => {
    setHmacSecret(generateSecret());
    setMaintenanceSecret(generateSecret());
  }, []);

  const handleCopy = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleRegenerate = () => {
    setHmacSecret(generateSecret());
    setMaintenanceSecret(generateSecret());
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-100">Configure PocketHost Secrets</h3>
        <p className="mt-1 text-sm text-slate-400">
          For production security, we generate two cryptographically secure secrets. You must
          configure these as environment variables in your PocketHost console.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              HMAC_SECRET
            </label>
            <span className="text-xs font-medium text-amber-400">⚠️ Shown once</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={hmacSecret}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono text-sm text-slate-100 outline-none"
            />
            <Button
              type="button"
              onClick={() => handleCopy(hmacSecret, setCopiedHmac)}
              variant={copiedHmac ? 'primary' : 'secondary'}
            >
              {copiedHmac ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Secures signed token generation for player links, RSVP requests, and public feeds.
          </p>
        </div>

        <div className="space-y-2 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              MAINTENANCE_SECRET
            </label>
            <span className="text-xs font-medium text-amber-400">⚠️ Shown once</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={maintenanceSecret}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono text-sm text-slate-100 outline-none"
            />
            <Button
              type="button"
              onClick={() => handleCopy(maintenanceSecret, setCopiedMaintenance)}
              variant={copiedMaintenance ? 'primary' : 'secondary'}
            >
              {copiedMaintenance ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            Authenticates automated background maintenance processes and database integrity checks.
          </p>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <h4 className="text-sm font-semibold text-amber-400">PocketHost Configuration Steps:</h4>
        <ol className="list-inside list-decimal space-y-1 text-xs text-slate-300">
          <li>Log into your PocketHost dashboard console.</li>
          <li>Navigate to your instance settings / env variables panel.</li>
          <li>Add the variables above with their exact names and values.</li>
          <li>Save changes and restart your PocketHost instance.</li>
        </ol>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" onClick={handleRegenerate} variant="secondary">
          Regenerate Secrets
        </Button>
        <Button type="button" onClick={() => onSuccess({ hmacSecret, maintenanceSecret })}>
          I have set these, continue
        </Button>
      </div>
    </div>
  );
}
