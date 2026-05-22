import { useEffect, useMemo, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { settingsService } from '../../services/settingsService';
import { useChoirName } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';

export default function SettingsView() {
  const dialog = useDialog();
  const { setChoirName: setContextChoirName } = useChoirName();
  const [choirName, setChoirName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [initialChoirName, setInitialChoirName] = useState('');

  useEffect(() => {
    const load = async () => {
      const loadedChoirName = await settingsService.getChoirName();
      setChoirName(loadedChoirName);
      setInitialChoirName(loadedChoirName);
      setIsLoading(false);
    };

    load().catch(() => {
      setMessage('Could not load system settings.');
      setIsLoading(false);
    });
  }, []);

  const isDirty = useMemo(() => {
    return calculateSettingsDirty(initialChoirName, choirName);
  }, [initialChoirName, choirName]);

  const handleGlobalDiscard = () => {
    setChoirName(initialChoirName);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await settingsService.saveChoirName(choirName);
      setContextChoirName(choirName);
      setInitialChoirName(choirName);
      setMessage('System settings saved.');
      await dialog.showMessage({ title: 'Success', message: 'System settings saved successfully.' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage(`Error: ${errMsg}`);
      await dialog.showMessage({ title: 'Error', message: 'Failed to save system settings.', variant: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading system settings...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>System Settings</h1>
      </div>

      {message && <div className="badge badge-rehearsal" style={{ alignSelf: 'flex-start' }}>{message}</div>}

      <AppCard title="Choir Name">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Organization Name</label>
          <input
            id="choir-name"
            type="text"
            value={choirName}
            onChange={(event) => setChoirName(event.target.value)}
            placeholder="e.g. Downtown Community Chorale"
            className="card"
            style={{ width: '100%', maxWidth: '400px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Displayed in the browser tab title across all pages (e.g. "Roster Management - My Choir").
          </p>
        </div>
      </AppCard>

      <FloatingSaveBar 
        isDirty={isDirty} 
        isSaving={isSaving} 
        onSave={handleSave} 
        onDiscard={handleGlobalDiscard} 
      />
    </div>
  );
}
