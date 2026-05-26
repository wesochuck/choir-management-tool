import React, { useState, useEffect, useMemo } from 'react';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { PhotoUploader } from '../common/PhotoUploader';
import { formatPocketBaseError, pb } from '../../lib/pocketbase';
import { eventService, type Event } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileInput) => Promise<void>;
  onDelete?: (profile: Profile) => Promise<void>;
  initialData?: Profile | null;
}

import { useVoiceParts } from '../../hooks/useVoiceParts';

export const SingerModal: React.FC<SingerModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const dialog = useDialog();
  const { voiceParts } = useVoiceParts();
  const [formData, setFormData] = useState<ProfileInput>({
    name: '',
    email: '',
    password: '',
    phone: '',
    voicePart: '',
    globalStatus: 'Active (Current)',
    notes: '',
    doNotEmail: false,
    statusIsManual: false,
  });
  const [isSubmitting, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset state
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleResetPassword = async () => {
    const email = formData.email?.trim();
    if (!email) return;
    setIsResettingPassword(true);
    setResetFeedback(null);
    try {
      await profileService.requestPasswordReset(email);
      setResetFeedback('✓ Password reset email sent successfully!');
      setTimeout(() => setResetFeedback(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetFeedback(`Error: ${msg}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Tabs and RSVP History state
  const [activeTab, setActiveTab] = useState<'profile' | 'rsvps'>('profile');
  const [performances, setPerformances] = useState<Event[]>([]);
  const [rosters, setRosters] = useState<EventRoster[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [rsvpSaveErrors, setRsvpSaveErrors] = useState<Record<string, string>>({});
  const [savingRsvpId, setSavingRsvpId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      const restInitialData = { ...initialData } as Record<string, unknown>;
      delete restInitialData.password; // Strip password if it accidentally exists
      
      setFormData({
        ...restInitialData,
        email: initialData.expand?.user?.email || '',
        doNotEmail: initialData.doNotEmail || false,
        statusIsManual: initialData.statusIsManual || false,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        voicePart: '',
        globalStatus: 'Active (Current)',
        notes: '',
        doNotEmail: false,
        statusIsManual: false,
      });
    }
  }, [initialData, isOpen]);

  // Reset tab when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('profile');
      setPerformances([]);
      setRosters([]);
      setRsvpSaveErrors({});
      setSavingRsvpId(null);
    }
  }, [isOpen]);

  // Load RSVP history when on RSVPs tab
  useEffect(() => {
    if (!isOpen || !initialData || activeTab !== 'rsvps') return;

    const loadRsvps = async () => {
      setLoadingRsvps(true);
      try {
        const [allEvents, allRosters] = await Promise.all([
          eventService.getEvents(),
          rosterService.getSingerRosters(initialData.id),
        ]);
        setPerformances(allEvents.filter(e => e.type === 'Performance'));
        setRosters(allRosters);
      } catch (err) {
        console.error('Failed to load RSVP history:', err);
      } finally {
        setLoadingRsvps(false);
      }
    };

    loadRsvps();
  }, [isOpen, initialData, activeTab]);

  const isDirty = useMemo(() => {
    if (initialData) {
      const nameChanged = (formData.name || '') !== (initialData.name || '');
      const emailChanged = (formData.email || '') !== (initialData.expand?.user?.email || '');
      const phoneChanged = (formData.phone || '') !== (initialData.phone || '');
      const voicePartChanged = (formData.voicePart || '') !== (initialData.voicePart || '');
      const globalStatusChanged = (formData.globalStatus || '') !== (initialData.globalStatus || '');
      const notesChanged = (formData.notes || '') !== (initialData.notes || '');
      const emailOptChanged = Boolean(formData.doNotEmail) !== Boolean(initialData.doNotEmail);
      const manualStatusChanged = Boolean(formData.statusIsManual) !== Boolean(initialData.statusIsManual);
      const photoChanged = formData.photo !== initialData.photo;

      return nameChanged || emailChanged || phoneChanged || voicePartChanged || globalStatusChanged || notesChanged || emailOptChanged || manualStatusChanged || photoChanged;
    } else {
      const hasName = Boolean(formData.name?.trim());
      const hasEmail = Boolean(formData.email?.trim());
      const hasPhone = Boolean(formData.phone?.trim());
      const hasVoicePart = Boolean(formData.voicePart);
      const isStatusChanged = formData.globalStatus !== 'Active (Current)';
      const hasNotes = Boolean(formData.notes?.trim());
      const hasEmailOpt = Boolean(formData.doNotEmail);
      const hasManualStatus = Boolean(formData.statusIsManual);

      return hasName || hasEmail || hasPhone || hasVoicePart || isStatusChanged || hasNotes || hasEmailOpt || hasManualStatus;
    }
  }, [formData, initialData]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: initialData 
          ? 'You have unsaved changes to this singer\'s profile. Do you want to discard them?' 
          : 'You are adding a new singer with unsaved details. Do you want to discard this singer?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning'
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Save Singer',
        message: formatPocketBaseError(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const shouldDelete = await dialog.confirm({
      title: 'Delete Singer',
      message: `Delete ${initialData.name} from the roster and remove their login?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(initialData);
      onClose();
    } catch {
      await dialog.showMessage({
        title: 'Could Not Delete Singer',
        message: 'Error deleting singer',
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRsvpChange = async (eventId: string, newRsvp: 'Yes' | 'No' | 'Pending') => {
    if (!initialData) return;
    setSavingRsvpId(eventId);
    try {
      const updated = await rosterService.updateRSVP(eventId, initialData.id, newRsvp);
      setRosters(prev => {
        const idx = prev.findIndex(r => r.event === eventId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], rsvp: newRsvp };
          return next;
        } else {
          return [...prev, updated];
        }
      });
      setRsvpSaveErrors(prev => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
    } catch (err) {
      console.error('Failed to update RSVP:', err);
      setRsvpSaveErrors(prev => ({
        ...prev,
        [eventId]: 'Failed to save',
      }));
    } finally {
      setSavingRsvpId(null);
    }
  };

  const { upcomingPerformances, pastPerformances } = useMemo(() => {
    const now = new Date();
    const upcoming: Event[] = [];
    const past: Event[] = [];

    performances.forEach(p => {
      const pDate = new Date(p.date);
      if (pDate >= now) {
        upcoming.push(p);
      } else {
        past.push(p);
      }
    });

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { upcomingPerformances: upcoming, pastPerformances: past };
  }, [performances]);

  const getSelectStyle = (val: string) => {
    const base = {
      padding: '0 8px',
      height: '32px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '13px',
      fontWeight: 600,
      border: '1px solid transparent',
      cursor: 'pointer',
      transition: 'all 0.2s',
      outline: 'none',
    };
    if (val === 'Yes') {
      return {
        ...base,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        color: '#15803d',
        border: '1px solid rgba(34, 197, 94, 0.3)',
      };
    }
    if (val === 'No') {
      return {
        ...base,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#b91c1c',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      };
    }
    return {
      ...base,
      backgroundColor: 'rgba(107, 114, 128, 0.1)',
      color: '#4b5563',
      border: '1px solid rgba(107, 114, 128, 0.2)',
    };
  };

  const renderAttendanceBadge = (status: string) => {
    let bg = 'rgba(107, 114, 128, 0.1)';
    let fg = '#4b5563';
    let text = 'Pending';
    if (status === 'Present') {
      bg = 'rgba(34, 197, 94, 0.15)';
      fg = '#15803d';
      text = 'Present';
    } else if (status === 'Absent') {
      bg = 'rgba(239, 68, 68, 0.15)';
      fg = '#b91c1c';
      text = 'Absent';
    }
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: bg,
        color: fg,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {text}
      </span>
    );
  };

  const renderPerformanceRow = (p: Event, isPast: boolean) => {
    const rosterEntry = rosters.find(r => r.event === p.id);
    const currentRsvp = rosterEntry?.rsvp || 'Pending';
    const currentAttendance = rosterEntry?.attendance || 'Pending';
    const isSaving = savingRsvpId === p.id;
    const saveError = rsvpSaveErrors[p.id];

    const pDate = new Date(p.date);
    const dateStr = pDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = pDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    
    return (
      <div key={p.id} className="flex-row card" style={{
        padding: 'var(--space-md)',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        boxShadow: 'none',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        <div className="flex-col" style={{ gap: '2px', minWidth: '100px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            {dateStr}
          </span>
          <span className="text-xs text-muted">
            {timeStr}
          </span>
        </div>

        <div className="flex-col" style={{ flex: 1, gap: '2px', minWidth: '120px' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
            {p.title}
          </span>
          <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              {p.expand?.venue?.name || 'No venue'}
            </span>
          </span>
        </div>

        <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-md)', flexShrink: 0 }}>
          {isPast && (
            <div className="flex-col" style={{ alignItems: 'center', gap: '2px' }}>
              <span className="text-xs text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Attended</span>
              {renderAttendanceBadge(currentAttendance)}
            </div>
          )}

          <div className="flex-col" style={{ alignItems: 'flex-start', gap: '2px' }}>
            <span className="text-xs text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>RSVP</span>
            <div className="flex-row" style={{ alignItems: 'center', gap: '8px' }}>
              <select
                value={currentRsvp}
                disabled={isSaving}
                onChange={(e) => handleRsvpChange(p.id, e.target.value as EventRoster['rsvp'])}
                style={getSelectStyle(currentRsvp)}
              >
                <option value="Pending">Pending</option>
                <option value="Yes">Yes (Attending)</option>
                <option value="No">No (Declined)</option>
              </select>
              
              {isSaving && (
                <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="saving-spinner" style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    borderTop: '2px solid var(--primary)',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }}></span>
                </span>
              )}
              
              {saveError && (
                <span className="text-xs" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                  {saveError}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Singer' : 'Add Singer'}
      maxWidth="640px"
      minHeight={initialData ? '680px' : undefined}
      footer={
        <>
          {activeTab === 'profile' ? (
            <>
              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="btn btn-danger"
                  style={{ marginRight: 'auto' }}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Singer'}
                </button>
              )}
              <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
              <button 
                type="submit" 
                form="singer-form"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button type="button" onClick={handleClose} className="btn btn-primary">Close</button>
          )}
        </>
      }
    >
      {initialData && (
        <div className="flex-row" style={{ borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-md)', gap: 'var(--space-md)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: activeTab === 'profile' ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rsvps')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'rsvps' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'rsvps' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: activeTab === 'rsvps' ? 600 : 500,
              transition: 'all 0.2s',
            }}
          >
            Performance RSVPs
          </button>
        </div>
      )}

      {activeTab === 'profile' ? (
        <form id="singer-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {initialData ? (
              <>
                <PhotoUploader
                  profileId={initialData.id}
                  profileName={initialData.name}
                  currentPhotoUrl={initialData.photo ? pb.files.getURL(initialData, initialData.photo) : undefined}
                  size="md"
                  onSuccess={(updated) => {
                    setFormData(prev => ({
                      ...prev,
                      photo: updated.photo
                    }));
                  }}
                />
              </>
            ) : (
              <>
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  backgroundColor: 'var(--bg)', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)', fontSize: '36px',
                }}>
                  ?
                </div>
                <span className="text-xs text-muted">Save first to add a photo</span>
              </>
            )}
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Name</label>
            <input 
              value={formData.name || ''} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'flex-start' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Login Email (Optional)</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="card"
                placeholder="e.g. singer@example.com"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              />
              <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                {initialData?.user 
                  ? "They already have a login account." 
                  : "If provided, they will automatically be sent an email to set up their password and access the portal."}
              </p>
              {initialData?.user && formData.email && (
                <div className="flex-col" style={{ gap: '4px', marginTop: '6px', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                    className="btn btn-xs btn-secondary"
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {isResettingPassword ? 'Sending Link...' : '🔑 Reset Password'}
                  </button>
                  {resetFeedback && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: resetFeedback.startsWith('Error') ? 'var(--color-danger-text, #ef4444)' : 'var(--color-success-text, #22c55e)'
                    }}>
                      {resetFeedback}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Phone (Optional)</label>
              <input 
                value={formData.phone || ''} 
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                className="card"
                placeholder="e.g. 555-123-4567"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              />
            </div>
          </div>
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Voice Part</label>
              <select 
                value={formData.voicePart} 
                onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as Profile['voicePart'] })}
                required
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value="" disabled>-- Please Select --</option>
                {voiceParts.map(v => (
                  <option key={v.label} value={v.label}>
                    {v.label} {v.fullName ? `(${v.fullName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <label className="text-label">Status</label>
              <select 
                value={formData.globalStatus} 
                onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as Profile['globalStatus'] })}
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value="Active (Current)">Active (Current)</option>
                <option value="Active (Future)">Active (Future)</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                checked={formData.doNotEmail}
                onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span className="text-label">Do Not Email</span>
            </label>
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                checked={formData.statusIsManual}
                onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span className="text-label">Lock Status (Disable Automation)</span>
            </label>
          </div>

          {initialData?.statusLastChangedAt && (
            <div className="card" style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg)', boxShadow: 'none', border: '1px solid var(--border)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                <strong>Status Last Changed:</strong> {new Date(initialData.statusLastChangedAt).toLocaleString()}
              </div>
              <div className="text-xs text-muted">
                <strong>Reason:</strong> {initialData.statusChangeReason || 'Manual update'}
              </div>
            </div>
          )}

          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label">Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              className="card"
              style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '100px', resize: 'vertical' }}
            />
          </div>
        </form>
      ) : (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>

          {loadingRsvps ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading RSVP history...
            </div>
          ) : (
            <>
              <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>
                  Upcoming Performances ({upcomingPerformances.length})
                </h3>
                <div className="flex-col" style={{ gap: 'var(--space-xs)', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {upcomingPerformances.map(p => renderPerformanceRow(p, false))}
                  {upcomingPerformances.length === 0 && (
                    <div className="text-muted text-sm" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                      No upcoming performances.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>
                  Past Performances ({pastPerformances.length})
                </h3>
                <div className="flex-col" style={{ gap: 'var(--space-xs)', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                  {pastPerformances.map(p => renderPerformanceRow(p, true))}
                  {pastPerformances.length === 0 && (
                    <div className="text-muted text-sm" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                      No past performances.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </BaseModal>
  );
};
