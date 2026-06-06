import React, { useState, useEffect, useMemo } from 'react';
import type { Profile } from '../../services/profileService';
import { profileService } from '../../services/profileService';
import { BaseModal } from '../common/BaseModal';
import './RosterUtils.css';

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
      <div className="flex-col roster-ut-lookup-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, voice part, status..."
          className="card roster-ut-lookup-search"
          autoFocus
        />

        {isLoading ? (
          <div className="roster-ut-lookup-status">
            Loading roster database...
          </div>
        ) : error ? (
          <div className="roster-ut-lookup-error">
            ⚠️ {error}
          </div>
        ) : (
          <div className="flex-col roster-ut-lookup-list">
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={async () => {
                  await onSelect(p);
                  onClose();
                }}
                className="flex-row card roster-ut-lookup-item"
              >
                <div className="flex-col roster-ut-lookup-item-content">
                  <span className="roster-ut-lookup-item-name">{p.name}</span>
                  <span className="text-xs text-muted">Status: {p.globalStatus}</span>
                </div>
                <span className="badge badge-rehearsal roster-ut-lookup-badge">
                  {p.voicePart || 'Unknown'}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="roster-ut-lookup-empty">
                No singers found
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
