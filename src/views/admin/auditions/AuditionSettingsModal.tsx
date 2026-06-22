import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Button, Select, Input, Textarea, Modal } from '../../../components/ui';
import { useDialog } from '../../../contexts/DialogContext';
import { formatInTimezone, zonedInputValueToUtc } from '../../../lib/timezone';
import type { AuditionSettings } from '../../../services/settingsService';

interface AuditionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AuditionSettings | null;
  onSave: (settings: AuditionSettings) => Promise<void>;
  isSaving: boolean;
  performances: Array<{ id: string; title: string; date: string }>;
  timezone: string;
  admins: Array<{ id: string; name: string; email: string }>;
}

export function AuditionSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  isSaving,
  performances,
  timezone,
  admins,
}: AuditionSettingsModalProps) {
  const dialog = useDialog();

  const [settingsDraft, setSettingsDraft] = useState<AuditionSettings | null>(null);
  const [backupDraft, setBackupDraft] = useState<AuditionSettings | null>(null);
  const [settingsTab, setSettingsTab] = useState<'general' | 'slots'>('general');

  // Slot Generator State
  const [genDate, setGenDate] = useState('');
  const [genStart, setGenStart] = useState('18:00');
  const [genEnd, setGenEnd] = useState('20:00');
  const [genInterval, setGenInterval] = useState('15');

  const wasOpenRef = useRef(false);

  // Initialize draft when modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && settings) {
      const snapshot = JSON.parse(JSON.stringify(settings)) as AuditionSettings;
      setSettingsDraft(snapshot);
      setBackupDraft(snapshot);
      setSettingsTab('general');
    } else if (!isOpen) {
      setSettingsDraft(null);
      setBackupDraft(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, settings]);

  const generateSlots = () => {
    if (!genDate || !genStart || !genEnd || !genInterval) return;

    const startStr = `${genDate}T${genStart}`;
    const endStr = `${genDate}T${genEnd}`;

    const startUtc = new Date(zonedInputValueToUtc(startStr, timezone));
    const endUtc = new Date(zonedInputValueToUtc(endStr, timezone));

    if (startUtc >= endUtc) {
      dialog.showToast('End time must be after start time.');
      return;
    }

    const intervalMs = parseInt(genInterval) * 60 * 1000;
    const newSlots: string[] = [];

    let current = startUtc;
    while (current < endUtc) {
      newSlots.push(current.toISOString());
      current = new Date(current.getTime() + intervalMs);
    }

    if (settingsDraft) {
      const merged = [...(settingsDraft.slots || []), ...newSlots];
      // deduplicate and sort
      const uniqueSorted = Array.from(new Set(merged)).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      setSettingsDraft({ ...settingsDraft, slots: uniqueSorted });
    }
  };

  const removeSlot = (slotToRemove: string) => {
    if (settingsDraft) {
      setSettingsDraft({
        ...settingsDraft,
        slots: settingsDraft.slots.filter((s) => s !== slotToRemove),
      });
    }
  };

  const handleSave = async () => {
    if (!settingsDraft) return;
    await onSave(settingsDraft);
  };

  const isDirty =
    backupDraft !== null && JSON.stringify(settingsDraft) !== JSON.stringify(backupDraft);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audition Settings"
      maxWidth="640px"
      isDirty={isDirty}
      footer={
        <div className="flex w-full items-center justify-between gap-4">
          <div className="text-left">
            {(!settingsDraft || !settingsDraft.slots || settingsDraft.slots.length === 0) && (
              <span className="text-danger-text text-xs font-semibold">
                ⚠️ Configure at least one time slot to save.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={!settingsDraft || !settingsDraft.slots || settingsDraft.slots.length === 0}
            >
              Save Settings
            </Button>
          </div>
        </div>
      }
    >
      {settingsDraft && (
        <div className="flex flex-col gap-4">
          {/* Tabs Header */}
          <div className="border-border mb-2 flex flex-row gap-4 border-b">
            <button
              type="button"
              onClick={() => setSettingsTab('general')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                settingsTab === 'general'
                  ? 'border-primary text-primary border-b-2 font-bold'
                  : 'text-text-muted border-b-2 border-transparent font-medium'
              }`}
            >
              General Settings
            </button>
            <button
              type="button"
              onClick={() => setSettingsTab('slots')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                settingsTab === 'slots'
                  ? 'border-primary text-primary border-b-2 font-bold'
                  : 'text-text-muted border-b-2 border-transparent font-medium'
              }`}
            >
              Time Slots
              {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                <span
                  className="text-danger-text ml-1.5 inline-flex items-center justify-center text-xs font-bold"
                  title="No time slots configured"
                >
                  ⚠️
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: General Settings */}
          {settingsTab === 'general' && (
            <div className="flex flex-col gap-6">
              <label className="flex cursor-pointer flex-row items-center gap-2 self-start select-none">
                <input
                  type="checkbox"
                  checked={settingsDraft.enabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, enabled: e.target.checked })
                  }
                  className="border-border text-primary accent-primary focus:ring-primary size-5 cursor-pointer rounded transition-all duration-200"
                />
                <span className="text-text text-sm font-semibold">
                  Accept public audition requests
                </span>
              </label>

              <div className="flex flex-col gap-1">
                <label className="text-text text-sm font-semibold">Target Performance</label>
                <Select
                  value={settingsDraft.defaultPerformanceId || ''}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, defaultPerformanceId: e.target.value })
                  }
                >
                  <option value="">-- No performance assigned --</option>
                  {performances.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatInTimezone(p.date, timezone, {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })}{' '}
                      - {p.title}
                    </option>
                  ))}
                </Select>
                <p className="text-text-muted m-0 mt-1 text-xs">
                  A target performance is <strong className="text-text">REQUIRED</strong> for the
                  public audition form to accept requests.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-text text-sm font-semibold">Confirmation Message</label>
                <Textarea
                  value={settingsDraft.confirmationMessage}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setSettingsDraft({ ...settingsDraft, confirmationMessage: e.target.value })
                  }
                  className="min-h-[80px]"
                />
              </div>

              <div className="border-border flex flex-col gap-2 border-t pt-4">
                <label className="flex cursor-pointer flex-row items-center gap-2 self-start select-none">
                  <input
                    type="checkbox"
                    checked={settingsDraft.adminNotifyEnabled || false}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        adminNotifyEnabled: e.target.checked,
                        adminNotifyUsers: settingsDraft.adminNotifyUsers || [],
                      })
                    }
                    className="border-border text-primary accent-primary focus:ring-primary size-5 cursor-pointer rounded transition-all duration-200"
                  />
                  <span className="text-text text-sm font-semibold">
                    Notify administrators of new submissions
                  </span>
                </label>

                {settingsDraft.adminNotifyEnabled && (
                  <div className="flex flex-col gap-1 pl-7">
                    <span className="text-overline text-text-muted">
                      Select Administrators to Notify
                    </span>
                    <div className="mt-1 flex flex-col gap-2">
                      {admins.map((admin) => {
                        const isChecked = (settingsDraft.adminNotifyUsers || []).includes(admin.id);
                        return (
                          <label
                            key={admin.id}
                            className="flex cursor-pointer flex-row items-center gap-2 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentUsers = settingsDraft.adminNotifyUsers || [];
                                const updatedUsers = e.target.checked
                                  ? [...currentUsers, admin.id]
                                  : currentUsers.filter((id) => id !== admin.id);
                                setSettingsDraft({
                                  ...settingsDraft,
                                  adminNotifyUsers: updatedUsers,
                                });
                              }}
                              className="border-border text-primary accent-primary focus:ring-primary size-4 cursor-pointer rounded transition-all duration-200"
                            />
                            <span className="text-text text-sm">
                              {admin.name} ({admin.email})
                            </span>
                          </label>
                        );
                      })}
                      {admins.length === 0 && (
                        <span className="text-text-muted text-xs">
                          No administrative accounts found.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Time Slots */}
          {settingsTab === 'slots' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-text flex items-center gap-1.5 text-sm font-semibold">
                  <span>Available Audition Times</span>
                  {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                    <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tracking-wider uppercase">
                      Required
                    </span>
                  )}
                </label>

                <div className="bg-surface-muted border-border rounded-xl border p-5 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <span className="text-overline text-text-muted">Generate Slots</span>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-text-muted text-xs font-medium">Date</span>
                        <Input
                          type="date"
                          value={genDate}
                          onChange={(e) => setGenDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-text-muted text-xs font-medium">Start Time</span>
                        <Input
                          type="time"
                          value={genStart}
                          onChange={(e) => setGenStart(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-text-muted text-xs font-medium">End Time</span>
                        <Input
                          type="time"
                          value={genEnd}
                          onChange={(e) => setGenEnd(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-text-muted text-xs font-medium">Interval (mins)</span>
                        <Select
                          value={genInterval}
                          onChange={(e) => setGenInterval(e.target.value)}
                        >
                          <option value="10">10</option>
                          <option value="15">15</option>
                          <option value="20">20</option>
                          <option value="30">30</option>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={generateSlots}
                        disabled={!genDate || !genStart || !genEnd}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {settingsDraft.slots?.map((slot) => (
                    <div
                      key={slot}
                      className="border-border bg-surface hover:border-primary/50 flex w-full items-center justify-between gap-2 rounded-full border px-4 py-1.5 text-sm shadow-sm transition-colors"
                    >
                      <span className="text-text font-medium">
                        {formatInTimezone(slot, timezone, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot)}
                        className="text-text-muted hover:text-danger-text cursor-pointer border-none bg-transparent p-0 text-base leading-none transition-colors"
                        title="Remove slot"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                  <p className="text-danger-text m-0 mt-3 text-xs font-medium">
                    ⚠️ Generate at least one audition time slot so applicants can schedule their
                    audition.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
