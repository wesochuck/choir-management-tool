import { useEffect, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { useDialog } from '../../contexts/DialogContext';
import { auditionService, type Audition } from '../../services/auditionService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { eventService, type Event } from '../../services/eventService';

const statusOptions: Audition['status'][] = ['New', 'Contacted', 'Scheduled', 'Closed'];

export default function AuditionsView() {
  const dialog = useDialog();
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [performances, setPerformances] = useState<Event[]>([]);
  const [settings, setSettings] = useState<AuditionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [editingAudition, setEditingAudition] = useState<Audition | null>(null);
  const [performanceFilter, setPerformanceFilter] = useState('all');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [auditionList, allEvents, auditionSettings] = await Promise.all([
        auditionService.getAuditions(),
        eventService.getEvents(),
        settingsService.getAuditionSettings(),
      ]);
      setAuditions(auditionList);
      setPerformances(allEvents.filter(e => e.type === 'Performance'));
      setSettings(auditionSettings);
      // Auto-expand settings to guide user if no audition times are set
      if (!auditionSettings.slots || auditionSettings.slots.length === 0) {
        setShowSettings(true);
      }
      setError('');
    } catch {
      setError('Could not load auditions data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      await settingsService.saveAuditionSettings(settings);
      setShowSettings(false);
      dialog.showMessage({ title: 'Success', message: 'Audition settings updated.' });
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Failed to save settings.', variant: 'danger' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateStatus = async (audition: Audition, status: Audition['status']) => {
    const updated = await auditionService.updateAudition(audition.id, { status });
    setAuditions((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const updateAudition = async (id: string, data: Partial<Audition>) => {
    const updated = await auditionService.updateAudition(id, data);
    setAuditions((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const saveNotes = async (audition: Audition, notes: string) => {
    await updateAudition(audition.id, { notes });
  };

  const convertToSinger = async (audition: Audition) => {
    const shouldConvert = await dialog.confirm({
      title: 'Convert To Singer',
      message: `Create a singer profile for ${audition.name} and close this audition?`,
      confirmLabel: 'Convert',
    });
    if (!shouldConvert) return;

    try {
      await auditionService.convertAuditionToSinger(audition.id);
      await dialog.showMessage({
        title: 'Conversion Successful',
        message: `${audition.name} has been added to the choir roster and linked to their target performance schedule.`,
      });
      await fetchData();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Conversion Failed',
        message: err instanceof Error ? err.message : 'An error occurred while creating the singer profile.',
        variant: 'danger',
      });
    }
  };

  const removeAudition = async (audition: Audition) => {
    const shouldDelete = await dialog.confirm({
      title: 'Delete Audition',
      message: `Delete audition request for ${audition.name}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    await auditionService.deleteAudition(audition.id);
    setAuditions((current) => current.filter((item) => item.id !== audition.id));
  };

  const filteredAuditions = auditions.filter(a => 
    performanceFilter === 'all' || a.performance === performanceFilter
  );

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading auditions...</div>;
  if (error) return <div style={{ padding: 'var(--space-xl)', color: 'var(--color-danger-text)' }}>{error}</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Auditions</h1>
        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Hide Settings' : 'Configure Times & Settings'}
          </button>
          <a className="btn btn-ghost" href="/auditions" target="_blank" rel="noreferrer">Preview Public Form</a>
        </div>
      </div>

      {/* Status Banner */}
      {!isLoading && settings && (
        <div className="card" style={{ 
          backgroundColor: settings.enabled && settings.defaultPerformanceId ? 'rgba(74, 117, 89, 0.05)' : 'rgba(100, 116, 139, 0.05)',
          border: `1px solid ${settings.enabled && settings.defaultPerformanceId ? 'var(--primary)' : 'var(--border)'}`,
          padding: 'var(--space-md) var(--space-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <div style={{ fontSize: '1.5rem' }}>{settings.enabled && settings.defaultPerformanceId ? '🟢' : '⚪'}</div>
            <div className="flex-col" style={{ gap: 0 }}>
              <div className="text-label" style={{ fontWeight: 700, color: settings.enabled && settings.defaultPerformanceId ? 'var(--primary-deep)' : 'var(--text-muted)' }}>
                PUBLIC AUDITIONS: {settings.enabled && settings.defaultPerformanceId ? 'OPEN' : 'CLOSED'}
              </div>
              <div className="text-xs text-muted">
                {settings.enabled && settings.defaultPerformanceId 
                  ? `Accepting requests for: ${performances.find(p => p.id === settings.defaultPerformanceId)?.title || 'Selected Performance'}`
                  : !settings.enabled 
                    ? 'The public form is currently disabled.'
                    : 'A target performance must be selected to open the form.'}
              </div>
            </div>
          </div>
          {!showSettings && (
            <button 
              className={settings.enabled && settings.defaultPerformanceId ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"} 
              onClick={() => setShowSettings(true)}
            >
              {settings.enabled && settings.defaultPerformanceId ? 'Configure Times' : 'Configure & Open'}
            </button>
          )}
        </div>
      )}

      {showSettings && settings && (
        <AppCard title="Audition Settings">
          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <label className="flex-row" style={{ gap: 'var(--space-sm)', alignSelf: 'flex-start' }}>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
              />
              <span className="text-label">Accept public audition requests</span>
            </label>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Target Performance</label>
              <select
                className="card"
                value={settings.defaultPerformanceId || ''}
                onChange={(e) => setSettings({ ...settings, defaultPerformanceId: e.target.value })}
                style={{ height: '44px', padding: '0 12px' }}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString()} - {p.title}</option>
                ))}
              </select>
              <p className="text-muted" style={{ margin: 0 }}>
                A target performance is <strong>REQUIRED</strong> for the public audition form to accept requests.
              </p>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <span>Available Audition Times</span>
                {(!settings.slots || settings.slots.length === 0) && (
                  <span className="badge badge-rehearsal" style={{ backgroundColor: 'var(--color-danger-text)', color: 'white', padding: '2px 6px', fontSize: '0.7rem' }}>Required</span>
                )}
              </label>
              <textarea
                value={(settings.slots || []).join('\n')}
                onChange={(e) => setSettings({ ...settings, slots: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                className="card"
                style={{ 
                  minHeight: '120px', 
                  resize: 'vertical',
                  border: (!settings.slots || settings.slots.length === 0) ? '1px solid var(--color-danger-text)' : '1px solid var(--border)' 
                }}
                placeholder="Enter audition times, one per line (e.g. Monday 5:00 PM)..."
              />
              {(!settings.slots || settings.slots.length === 0) ? (
                <p style={{ color: 'var(--color-danger-text)', fontSize: '0.8125rem', margin: 0, fontWeight: 500 }}>
                  ⚠️ Add at least one audition time slot so applicants can schedule their audition.
                </p>
              ) : (
                <p className="text-muted" style={{ margin: 0 }}>
                  Enter one time per line. These will appear as options in the dropdown on the public audition form.
                </p>
              )}
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Confirmation Message</label>
              <textarea
                value={settings.confirmationMessage}
                onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                className="card"
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </AppCard>
      )}

      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label text-muted">Filter by Performance</label>
          <select
            className="card"
            value={performanceFilter}
            onChange={(e) => setPerformanceFilter(e.target.value)}
            style={{ minWidth: '240px', height: '40px', padding: '0 12px' }}
          >
            <option value="all">All Auditions</option>
            {performances.map(p => (
              <option key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString()} - {p.title}</option>
            ))}
          </select>
        </div>
      </div>

      <AppCard noPadding>
        {filteredAuditions.map((audition) => (
          <div key={audition.id} className="flex-responsive relative-row" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <h3 style={{ margin: 0 }}>{audition.name}</h3>
              <div className="text-label">{audition.timeSlot}</div>
              <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                {audition.voicePart && <div className="badge badge-rehearsal">{audition.voicePart}</div>}
                {audition.expand?.performance && (
                  <div className="badge badge-performance">
                    {audition.expand.performance.title}
                  </div>
                )}
              </div>
              {audition.experience && <p className="text-muted text-sm" style={{ margin: 0 }}>{audition.experience}</p>}
              <a
                href={audition.contact.includes('@') ? `mailto:${audition.contact}` : `tel:${audition.contact}`}
                onClick={(event) => event.stopPropagation()}
                className="text-muted"
              >
                {audition.contact}
              </a>
            </div>
            <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
              <textarea
                className="card"
                defaultValue={audition.notes || ''}
                placeholder="Internal notes"
                onClick={(event) => event.stopPropagation()}
                onBlur={(event) => saveNotes(audition, event.target.value)}
                style={{ minHeight: '44px', width: '180px', padding: '8px', resize: 'vertical' }}
              />
              <select
                className="card"
                value={audition.status}
                onClick={(event) => event.stopPropagation()}
                onChange={(e) => updateStatus(audition, e.target.value as Audition['status'])}
                style={{ height: '44px', padding: '0 12px' }}
              >
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <button
                className="btn btn-secondary btn-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  convertToSinger(audition);
                }}
              >
                Convert
              </button>
              <button className="btn btn-ghost btn-sm expanded-hit-area" onClick={() => setEditingAudition(audition)}>Edit</button>
              <button
                className="btn btn-danger btn-sm"
                onClick={(event) => {
                  event.stopPropagation();
                  removeAudition(audition);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {filteredAuditions.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <p className="text-muted">No audition requests found for this filter.</p>
          </div>
        )}
      </AppCard>

      <AuditionModal
        audition={editingAudition}
        isOpen={Boolean(editingAudition)}
        onClose={() => setEditingAudition(null)}
        onSave={updateAudition}
      />
    </div>
  );
}
