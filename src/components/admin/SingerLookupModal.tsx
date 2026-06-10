import React, { useState, useEffect, useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { profileService } from '../../services/profileService';
import { BaseModal } from '../common/BaseModal';

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
    <BaseModal
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
          className="card w-full px-3 h-10 border border-border"
          autoFocus
        />

        {isLoading ? (
          <div className="text-center p-4 text-text-muted">
            Loading roster database...
          </div>
        ) : error ? (
          <div className="text-danger-text p-4 text-center">
            ⚠️ {error}
          </div>
        ) : (
          <div className="flex-col gap-[6px] max-h-[300px] overflow-y-auto pr-1">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={async () => {
                  await onSelect(p);
                  onClose();
                }}
                className="flex-row card p-[10px_14px] justify-between items-center cursor-pointer border border-border bg-bg text-left w-full gap-2"
              >
                <div className="flex-col gap-0.5">
                  <span className="font-semibold text-text">{p.name}</span>
                  <span className="text-xs text-muted">Status: {p.globalStatus}</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary-light text-primary-deep">
                  {p.voicePart || 'Unknown'}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center p-4 text-text-muted text-sm">
                No singers found
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
