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
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, voice part, status..."
          className="card"
          style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)' }}
          autoFocus
        />

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>
            Loading roster database...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--color-danger-text)', padding: 'var(--space-md)', textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        ) : (
          <div className="flex-col" style={{ gap: '6px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={async () => {
                  await onSelect(p);
                  onClose();
                }}
                className="flex-row card"
                style={{
                  padding: '10px 14px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  textAlign: 'left',
                  width: '100%',
                  display: 'flex',
                  gap: 'var(--space-sm)'
                }}
              >
                <div className="flex-col" style={{ gap: '2px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                  <span className="text-xs text-muted">Status: {p.globalStatus}</span>
                </div>
                <span className="badge badge-rehearsal" style={{ textTransform: 'uppercase' }}>
                  {p.voicePart || 'Unknown'}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No singers found
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
