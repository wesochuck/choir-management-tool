import React, { useState, useEffect, useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { profileService } from '../../services/profileService';
import { Modal } from '../ui';

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
      maxWidth="500px"
      footer={<button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>}
    >
      <div className="flex-col gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, voice part, status..."
          className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-10 w-full px-3"
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
          <div className="max-h-[300px] flex-col gap-[6px] overflow-y-auto pr-1">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={async () => {
                  await onSelect(p);
                  onClose();
                }}
                className="bg-surface hover:bg-bg w-full cursor-pointer flex-row items-center justify-between gap-2 border border-border p-[10px_14px] text-left rounded-xl shadow-sm transition-all duration-200"
              >
                <div className="flex-col gap-0.5">
                  <span className="font-semibold text-text">{p.name}</span>
                  <span className="text-muted text-xs">Status: {p.globalStatus}</span>
                </div>
                <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">
                  {p.voicePart || 'Unknown'}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-sm text-text-muted">
                No singers found
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
