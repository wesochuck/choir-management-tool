import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../common/AppCard';
import { Input, Button, Modal } from '../ui';
import { useDialog } from '../../contexts/DialogContext';
import { seasonService, type Season } from '../../services/seasonService';

export function SeasonManagementSettings() {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const { data: seasons, isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => seasonService.getAllSeasons(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => seasonService.toggleActiveSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      dialog.showToast('Active season updated');
    },
    onError: () => {
      dialog.showToast('Failed to update active season');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => seasonService.deleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      dialog.showToast('Season deleted');
    },
    onError: () => {
      dialog.showToast('Failed to delete season');
    },
  });

  const handleDelete = async (s: Season) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Season',
      message: `Are you sure you want to delete ${s.name}? This will NOT delete associated dues records, but they will become orphaned.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (confirmed) {
      deleteMutation.mutate(s.id);
    }
  };

  const handleEdit = (s: Season) => {
    setEditingSeason(s);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSeason(null);
    setIsModalOpen(true);
  };

  return (
    <AppCard title="Season Management">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-slate-500">
          Manage seasons for dues tracking and roster displays. The active season is shown on the
          dashboard and roster.
        </p>

        {isLoading ? (
          <div className="text-xs text-slate-500">Loading seasons...</div>
        ) : (
          <div className="divide-y rounded-md border border-slate-200">
            {seasons?.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No seasons created yet.</div>
            ) : (
              seasons?.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {s.name}
                      {s.isActive && (
                        <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {(s.duesAmountCents / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}{' '}
                      dues &bull; {new Date(s.startDate).toLocaleDateString()} to{' '}
                      {new Date(s.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.isActive && (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => toggleActiveMutation.mutate(s.id)}
                      >
                        Make Active
                      </Button>
                    )}
                    <Button
                      title="Edit"
                      variant="outline"
                      size="small"
                      onClick={() => handleEdit(s)}
                    >
                      <span aria-hidden="true">✏️</span> Edit
                    </Button>
                    <Button
                      title="Delete"
                      variant="danger"
                      size="small"
                      onClick={() => handleDelete(s)}
                    >
                      <span aria-hidden="true" className="text-white">
                        🗑️
                      </span>{' '}
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div>
          <Button size="small" onClick={handleCreate}>
            + Create Season
          </Button>
        </div>
      </div>

      <SeasonFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingSeason}
        seasons={seasons}
      />
    </AppCard>
  );
}

function SeasonFormModal({
  isOpen,
  onClose,
  initialData,
  seasons,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialData: Season | null;
  seasons: Season[] | undefined;
}) {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState('');
  const [duesAmount, setDuesAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when opened
  if (isOpen && initialData && name === '' && !isSaving) {
    setName(initialData.name);
    setStartDate(initialData.startDate.substring(0, 10)); // Extract YYYY-MM-DD
    setEndDate(initialData.endDate.substring(0, 10));
    setDuesAmount((initialData.duesAmountCents / 100).toString());
  }

  const handleClose = () => {
    setName('');
    setStartDate(new Date().toLocaleDateString('en-CA'));
    setEndDate('');
    setDuesAmount('');
    onClose();
  };

  const handleSave = async () => {
    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        dialog.showMessage({
          title: 'Validation Error',
          message: 'End date cannot be before start date.',
          variant: 'danger',
        });
        return;
      }

      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      const overlappingSeason = seasons?.find((s) => {
        if (initialData && s.id === initialData.id) return false;
        if (!s.startDate || !s.endDate) return false;

        const sStart = new Date(s.startDate.substring(0, 10));
        const sEnd = new Date(s.endDate.substring(0, 10));

        return newStart <= sEnd && newEnd >= sStart;
      });

      if (overlappingSeason) {
        dialog.showMessage({
          title: 'Overlap Error',
          message: `The selected dates overlap with the existing season: "${overlappingSeason.name}" (${new Date(overlappingSeason.startDate).toLocaleDateString()} to ${new Date(overlappingSeason.endDate).toLocaleDateString()}).`,
          variant: 'danger',
        });
        return;
      }
    }

    try {
      setIsSaving(true);
      const data = {
        name,
        startDate: startDate ? new Date(startDate).toISOString() : '',
        endDate: endDate ? new Date(endDate).toISOString() : '',
        duesAmountCents: Math.round(parseFloat(duesAmount || '0') * 100),
      };

      if (initialData) {
        await seasonService.updateSeason(initialData.id, data);
      } else {
        await seasonService.createSeason(data);
      }

      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      dialog.showToast(initialData ? 'Season updated' : 'Season created');
      handleClose();
    } catch (err: unknown) {
      dialog.showMessage({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save season',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? 'Edit Season' : 'Create Season'}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-label">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fall 2026"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-label">Dues Amount ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={duesAmount}
            onChange={(e) => setDuesAmount(e.target.value)}
            placeholder="e.g. 50.00"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-label">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-label">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving || !name}>
          {isSaving ? 'Saving...' : 'Save Season'}
        </Button>
      </div>
    </Modal>
  );
}
