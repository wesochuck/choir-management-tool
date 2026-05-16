import { useEffect, useState } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { useDialog } from '../../contexts/DialogContext';
import { auditionService, type Audition } from '../../services/auditionService';

const statusOptions: Audition['status'][] = ['New', 'Contacted', 'Scheduled', 'Closed'];

export default function AuditionsView() {
  const dialog = useDialog();
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingAudition, setEditingAudition] = useState<Audition | null>(null);

  const fetchAuditions = async () => {
    setIsLoading(true);
    try {
      setAuditions(await auditionService.getAuditions());
      setError('');
    } catch {
      setError('Could not load auditions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditions();
  }, []);

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

    await auditionService.convertAuditionToSinger(audition.id);
    await fetchAuditions();
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

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading auditions...</div>;
  if (error) return <div style={{ padding: 'var(--space-xl)', color: 'var(--color-danger-text)' }}>{error}</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Auditions</h1>
        <a className="btn btn-secondary" href="/auditions" target="_blank" rel="noreferrer">Open Public Form</a>
      </div>

      <AppCard noPadding>
        {auditions.map((audition) => (
          <div key={audition.id} className="flex-responsive relative-row" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <h3 style={{ margin: 0 }}>{audition.name}</h3>
              <div className="text-label">{audition.timeSlot}</div>
              {audition.voicePart && <div className="badge badge-rehearsal" style={{ alignSelf: 'flex-start' }}>{audition.voicePart}</div>}
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
        {auditions.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <p className="text-muted">No audition requests yet.</p>
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
