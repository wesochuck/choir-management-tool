import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../contexts/DialogContext';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone } from '../../lib/timezone';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { Button, Select, Badge, DataTable, type ColumnDef } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { type Audition, type AuditionInput } from '../../services/auditionService';
import { type AuditionSettings } from '../../services/settingsService';
import { useAuditionsManager } from './auditions/useAuditionsManager';
import { AuditionStatusBanner } from './auditions/AuditionStatusBanner';
import { AuditionSettingsModal } from './auditions/AuditionSettingsModal';
import { ScheduleAuditionModal } from './auditions/ScheduleAuditionModal';

export default function AuditionsView() {
  const dialog = useDialog();
  const navigate = useNavigate();

  const {
    auditions,
    settings,
    admins,
    isLoading,
    error,
    auditionUpdateMutation,
    auditionCreateMutation,
    auditionDeleteMutation,
    auditionConvertMutation,
    saveAuditionSettingsMutation,
  } = useAuditionsManager();

  const { timezone } = useChoirSettings();
  const { performances } = useEvents();

  const handleEmailClick = (email: string, name: string, voicePart: string) => {
    navigate('/admin/communications', {
      state: {
        initialRecipients: [
          {
            id: `audition-${email}`,
            name: name,
            email: email,
            phone: '',
            voicePart: voicePart,
            globalStatus: 'Auditionee',
          },
        ],
        initialSubject: 'Audition Inquiry',
        initialContent: `Dear ${name},\n\n`,
      },
    });
  };

  const [showSettings, setShowSettings] = useState(false);
  const [editingAudition, setEditingAudition] = useState<Audition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<Audition['status'][]>(['New', 'Scheduled']);

  // Auto-expand settings to guide user if no audition time slots are set.
  // Only fires while the modal is closed so a background refetch does not
  // re-open it after the user has dismissed it.
  useEffect(() => {
    if (!showSettings && settings && !settings.slots?.length) {
      setShowSettings(true);
    }
  }, [settings, showSettings]);

  const handleSaveSettings = async (updatedSettings: AuditionSettings) => {
    try {
      await saveAuditionSettingsMutation.mutateAsync(updatedSettings);
      setShowSettings(false);
      dialog.showToast('Audition settings updated.');
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to save settings.',
        variant: 'danger',
      });
    }
  };

  const handleCancelSettings = () => {
    setShowSettings(false);
  };

  // Scheduling Modal State
  const [schedulingAudition, setSchedulingAudition] = useState<Audition | null>(null);

  const confirmSchedule = async (finalSlot: string) => {
    if (!schedulingAudition) return;

    try {
      await auditionUpdateMutation.mutateAsync({
        id: schedulingAudition.id,
        data: { status: 'Scheduled', scheduledTimeSlot: finalSlot },
      });
      dialog.showToast('Audition scheduled and confirmation email sent.');
      setSchedulingAudition(null);
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to schedule audition.',
        variant: 'danger',
      });
    }
  };

  const updateStatus = async (audition: Audition, status: Audition['status']) => {
    await auditionUpdateMutation.mutateAsync({ id: audition.id, data: { status } });
  };

  const handleSaveAudition = async (id: string | null, data: Partial<Audition>) => {
    try {
      if (id) {
        await auditionUpdateMutation.mutateAsync({ id, data });
        dialog.showToast('Audition updated.');
      } else {
        const payload: AuditionInput = {
          name: data.name!,
          contact: data.contact!,
          scheduledTimeSlot: data.scheduledTimeSlot,
          requestedSlots: data.requestedSlots,
          voicePart: data.voicePart,
          experience: data.experience,
          performance: data.performance,
          notes: data.notes,
          status: data.status,
        };
        await auditionCreateMutation.mutateAsync(payload);
        dialog.showToast('Audition created successfully.');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      dialog.showMessage({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save audition.',
        variant: 'danger',
      });
    }
  };

  const convertToSinger = async (audition: Audition) => {
    const shouldConvert = await dialog.confirm({
      title: 'Convert To Singer',
      message: `Create a singer profile for ${audition.name} and close this audition?`,
      confirmLabel: 'Convert',
    });
    if (!shouldConvert) return;

    try {
      await auditionConvertMutation.mutateAsync(audition.id);
      dialog.showToast(`${audition.name} has been added to the choir roster.`);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Conversion Failed',
        message:
          err instanceof Error
            ? err.message
            : 'An error occurred while creating the singer profile.',
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

    await auditionDeleteMutation.mutateAsync(audition.id);
  };

  const [sortField, setSortField] = useState<'scheduledTimeSlot' | 'name'>('scheduledTimeSlot');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = (sorting: { id: string; desc: boolean }[]) => {
    if (sorting.length === 0) return;
    const s = sorting[0];
    setSortField(s.id as 'scheduledTimeSlot' | 'name');
    setSortDirection(s.desc ? 'desc' : 'asc');
  };

  const auditionColumns: ColumnDef<Audition>[] = [
    {
      id: 'name',
      header: 'Name / Contact',
      enableSorting: true,
      accessorFn: (r) => r.name,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{row.original.name}</span>
            {row.original.voicePart && <Badge tone="rehearsal">{row.original.voicePart}</Badge>}
          </div>
          {row.original.contact.includes('@') ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEmailClick(
                  row.original.contact,
                  row.original.name,
                  row.original.voicePart || ''
                );
              }}
              className="text-text-muted hover:text-primary cursor-pointer border-none bg-transparent p-0 text-left text-sm font-medium underline transition-colors"
            >
              {row.original.contact}
            </button>
          ) : (
            <a
              href={`tel:${row.original.contact}`}
              onClick={(e) => e.stopPropagation()}
              className="text-text-muted hover:text-primary text-sm font-medium transition-colors hover:underline"
            >
              {row.original.contact}
            </a>
          )}
        </div>
      ),
      meta: { cardSection: 0, cardSide: 'left' },
    },
    {
      id: 'performance',
      header: 'Target Performance',
      cell: ({ row }) =>
        row.original.expand?.performance ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/events?eventId=${row.original.performance}&openModal=true`);
            }}
            className="text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent p-0 text-left font-semibold underline transition-colors"
            title="Click to edit performance details"
          >
            {row.original.expand.performance.title}
          </button>
        ) : (
          <span className="text-text-muted text-sm">None</span>
        ),
      meta: { cardSection: 1, cardSide: 'left', cardLabel: 'Performance' },
    },
    {
      id: 'scheduledTimeSlot',
      header: 'Audition Time',
      enableSorting: true,
      accessorFn: (r) => r.scheduledTimeSlot,
      cell: ({ row }) =>
        row.original.status === 'Scheduled' && row.original.scheduledTimeSlot ? (
          <span className="text-sm font-semibold text-slate-900">
            {formatInTimezone(row.original.scheduledTimeSlot, timezone, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        ) : (
          <Badge tone="neutral">
            {row.original.requestedSlots && row.original.requestedSlots.length > 0
              ? `${row.original.requestedSlots.length} slot${row.original.requestedSlots.length > 1 ? 's' : ''} requested`
              : 'No times requested'}
          </Badge>
        ),
      meta: { cardSection: 1, cardSide: 'left', cardLabel: 'Time' },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          tone={
            row.original.status === 'New'
              ? 'rehearsal'
              : row.original.status === 'Scheduled'
                ? 'success'
                : 'neutral'
          }
        >
          {row.original.status}
        </Badge>
      ),
      meta: { cardSection: 0, cardSide: 'right' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div
          className="flex flex-row flex-wrap justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.contact.includes('@') && (
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                handleEmailClick(
                  row.original.contact,
                  row.original.name,
                  row.original.voicePart || ''
                )
              }
            >
              ✉️ Email
            </Button>
          )}
          {row.original.status === 'New' && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setSchedulingAudition(row.original)}
            >
              Schedule
            </Button>
          )}
          {row.original.status === 'Scheduled' && (
            <Button variant="secondary" size="small" onClick={() => convertToSinger(row.original)}>
              Convert to Singer
            </Button>
          )}
          {row.original.status !== 'Closed' && (
            <Button
              variant="outline"
              size="small"
              onClick={() => updateStatus(row.original, 'Closed')}
            >
              Close
            </Button>
          )}
          <Button variant="danger" size="small" onClick={() => removeAudition(row.original)}>
            Delete
          </Button>
        </div>
      ),
      meta: { align: 'right', cardSection: 1, cardSide: 'right' },
    },
  ];

  const filteredAuditions = auditions.filter(
    (a) =>
      (performanceFilter === 'all' || a.performance === performanceFilter) &&
      statusFilter.includes(a.status)
  );

  const sortedAuditions = useMemo(() => {
    return [...filteredAuditions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'scheduledTimeSlot') {
        const timeA = a.scheduledTimeSlot ? new Date(a.scheduledTimeSlot).getTime() : 0;
        const timeB = b.scheduledTimeSlot ? new Date(b.scheduledTimeSlot).getTime() : 0;

        if (timeA === 0 && timeB === 0) {
          comparison = 0;
        } else if (timeA === 0) {
          comparison = 1; // Put unscheduled items at the end
        } else if (timeB === 0) {
          comparison = -1; // Put unscheduled items at the end
        } else {
          comparison = timeA - timeB;
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredAuditions, sortField, sortDirection]);

  const renderMobileCard = (audition: Audition) => {
    return (
      <div className="flex flex-col gap-3">
        {/* Clickable Card Body */}
        <div
          className="flex cursor-pointer flex-col gap-3"
          onClick={() => {
            setEditingAudition(audition);
            setIsModalOpen(true);
          }}
        >
          {/* Row 0: Name, Voice Part, Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{audition.name}</span>
              {audition.voicePart && <Badge tone="rehearsal">{audition.voicePart}</Badge>}
            </div>
            <Badge
              tone={
                audition.status === 'New'
                  ? 'rehearsal'
                  : audition.status === 'Scheduled'
                    ? 'success'
                    : 'neutral'
              }
            >
              {audition.status}
            </Badge>
          </div>

          {/* Row 1: Contact, Performance, Time */}
          <div className="flex flex-col gap-1.5 text-xs text-slate-600">
            <div>
              {audition.contact.includes('@') ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEmailClick(audition.contact, audition.name, audition.voicePart || '');
                  }}
                  className="text-primary cursor-pointer border-none bg-transparent p-0 text-left font-medium hover:underline"
                >
                  ✉️ {audition.contact}
                </button>
              ) : (
                <a
                  href={`tel:${audition.contact}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-slate-600 hover:underline"
                >
                  📞 {audition.contact}
                </a>
              )}
            </div>

            <div className="flex items-start gap-1">
              <span className="font-semibold text-slate-400">Performance:</span>
              {audition.expand?.performance ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/events?eventId=${audition.performance}&openModal=true`);
                  }}
                  className="text-primary cursor-pointer border-none bg-transparent p-0 text-left font-semibold hover:underline"
                >
                  {audition.expand.performance.title}
                </button>
              ) : (
                <span className="text-slate-400">None</span>
              )}
            </div>

            <div className="flex items-start gap-1">
              <span className="font-semibold text-slate-400">Time:</span>
              {audition.status === 'Scheduled' && audition.scheduledTimeSlot ? (
                <span className="font-medium text-slate-900">
                  {formatInTimezone(audition.scheduledTimeSlot, timezone, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              ) : (
                <span className="font-medium text-slate-500">
                  {audition.requestedSlots && audition.requestedSlots.length > 0
                    ? `${audition.requestedSlots.length} slot${audition.requestedSlots.length > 1 ? 's' : ''} requested`
                    : 'No times requested'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Actions - Full-width flex-wrap */}
        <div className="mt-1 flex flex-row flex-wrap gap-2 border-t border-slate-100 pt-2">
          {audition.contact.includes('@') && (
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                handleEmailClick(audition.contact, audition.name, audition.voicePart || '')
              }
            >
              ✉️ Email
            </Button>
          )}
          {audition.status === 'New' && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => setSchedulingAudition(audition)}
            >
              Schedule
            </Button>
          )}
          {audition.status === 'Scheduled' && (
            <Button variant="secondary" size="small" onClick={() => convertToSinger(audition)}>
              Convert to Singer
            </Button>
          )}
          {audition.status !== 'Closed' && (
            <Button variant="outline" size="small" onClick={() => updateStatus(audition, 'Closed')}>
              Close
            </Button>
          )}
          <Button variant="danger" size="small" onClick={() => removeAudition(audition)}>
            Delete
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-8">Loading auditions...</div>;
  if (error)
    return (
      <div className="text-danger-text p-8">
        {error instanceof Error ? error.message : 'Could not load auditions data.'}
      </div>
    );

  return (
    <div className="flex flex-col gap-8 py-8">
      <AdminPageHeader
        title="Auditions"
        description="Review audition submissions, manage audition settings, and communicate with applicants."
        actions={
          <Button
            onClick={() => {
              setEditingAudition(null);
              setIsModalOpen(true);
            }}
            icon={<span className="text-base font-semibold">+</span>}
          >
            Add Audition
          </Button>
        }
      />

      <AuditionStatusBanner
        settings={settings}
        performances={performances}
        onConfigureClick={() => setShowSettings(true)}
      />

      <AuditionSettingsModal
        isOpen={showSettings}
        onClose={handleCancelSettings}
        settings={settings}
        onSave={handleSaveSettings}
        isSaving={saveAuditionSettingsMutation.isPending}
        performances={performances}
        timezone={timezone}
        admins={admins}
      />

      {/* Filters Bar */}
      <div className="border-border bg-surface flex flex-wrap items-end justify-between gap-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <div className="flex min-w-[280px] flex-col gap-1">
            <label className="text-label">Filter by Performance</label>
            <Select
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="all">All Auditions</option>
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
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Filter by Status</label>
            <div className="border-border bg-surface flex h-[44px] flex-row flex-wrap items-center gap-4 rounded-md border px-4">
              {(['New', 'Scheduled', 'Closed'] as Audition['status'][]).map((status) => {
                const isChecked = statusFilter.includes(status);
                return (
                  <label
                    key={status}
                    className="text-text flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setStatusFilter(statusFilter.filter((s) => s !== status));
                        } else {
                          setStatusFilter([...statusFilter, status]);
                        }
                      }}
                      className="border-border text-primary accent-primary focus:ring-primary size-4 cursor-pointer rounded"
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-text-muted pb-3 text-xs font-bold">
          {sortedAuditions.length} candidate{sortedAuditions.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      <DataTable
        columns={auditionColumns}
        data={sortedAuditions}
        isLoading={false}
        emptyState={{
          title: 'No auditions found.',
          icon: '🎭',
        }}
        hidePagination
        defaultSorting={[{ id: 'scheduledTimeSlot', desc: false }]}
        manualSorting
        onSortingChange={handleSortChange}
        onRowClick={(row) => {
          setEditingAudition(row);
          setIsModalOpen(true);
        }}
        renderMobileCard={renderMobileCard}
        getRowId={(r) => r.id}
        getRowClassName={() => 'hover:bg-primary-light/45'}
      />

      <AuditionModal
        audition={editingAudition}
        isOpen={isModalOpen}
        onClose={() => {
          setEditingAudition(null);
          setIsModalOpen(false);
        }}
        onSave={handleSaveAudition}
        settings={settings}
        performances={performances}
      />

      <ScheduleAuditionModal
        audition={schedulingAudition}
        isOpen={!!schedulingAudition}
        onClose={() => setSchedulingAudition(null)}
        onConfirm={confirmSchedule}
        savedSlots={settings?.slots ?? []}
        timezone={timezone}
      />
    </div>
  );
}
