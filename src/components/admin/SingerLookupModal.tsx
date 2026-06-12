import React, { useState, useEffect, useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { profileService } from '../../services/profileService';
import { Modal, Button } from '../ui';

interface SingerLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (profile: Profile) => Promise<void>;
  excludeIds: Set<string>;
}

export const SingerLookupModal: React.FC<SingerLookupModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeIds
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadProfiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const list = await profileService.getProfiles();
        setProfiles(list);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return profiles.filter(p => {
      if (excludeIds.has(p.id)) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.voicePart.toLowerCase().includes(query) ||
        p.globalStatus.toLowerCase().includes(query)
      );
    });
  }, [profiles, searchQuery, excludeIds]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lookup Singer"
      maxWidth="560px"
      footer={<Button type="button" onClick={onClose} variant="outline">Cancel</Button>}
    >
      <div className="flex-col gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search singers..."
          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-primary"
          autoFocus
        />

        {isLoading ? (
          <div className="p-4 text-center text-text-muted">
            Loading roster database...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-danger-text">
            ⚠️ {error}
          </div>
        ) : (
          <div className="flex-col gap-2">
            <div className="flex flex-row items-center justify-between px-1 text-xs text-muted">
              <span>
                {filtered.length} available singer{filtered.length === 1 ? '' : 's'}
              </span>
              <span className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-3 font-semibold uppercase tracking-wider text-text-muted sm:grid">
                <span>Name</span>
                <span>Voice</span>
                <span>Status</span>
              </span>
            </div>

            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-border bg-surface">
              <div className="divide-y divide-border">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      await onSelect(p);
                      onClose();
                    }}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-primary-light/50 focus:bg-primary-light/60 focus:outline-none"
                  >
                    <span className="min-w-0 truncate font-semibold text-text" title={p.name}>
                      {p.name}
                    </span>
                    <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">
                      {p.voicePart || 'Unknown'}
                    </span>
                    <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-medium text-muted">
                      {p.globalStatus}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="p-6 text-center text-sm text-text-muted">
                    No singers found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
