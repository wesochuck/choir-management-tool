import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import type { Profile } from '../../services/profileService';
import { profileService } from '../../services/profileService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { Modal, Button, Input } from '../ui';

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
  excludeIds,
}) => {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: profiles = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () => profileService.getProfiles(),
    enabled: isOpen,
  });
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : String(queryError)
    : null;

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return profiles.filter((p) => {
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
      title={`Lookup ${performerLabel}`}
      maxWidth="560px"
      footer={
        <Button type="button" onClick={onClose} variant="outline">
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${performerLabelPlural.toLowerCase()}...`}
          autoFocus
        />

        {isLoading ? (
          <div className="text-text-muted p-4 text-center">Loading roster database...</div>
        ) : error ? (
          <div className="text-danger-text p-4 text-center">⚠️ {error}</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-muted flex flex-row items-center justify-between px-1 text-xs">
              <span>
                {filtered.length} available {performerLabel.toLowerCase()}{filtered.length === 1 ? '' : 's'}
              </span>
              <span className="text-text-muted hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-3 font-semibold tracking-wider uppercase sm:grid">
                <span>Name</span>
                <span>Voice</span>
                <span>Status</span>
              </span>
            </div>

            <div className="border-border bg-surface max-h-[320px] overflow-y-auto rounded-lg border">
              <div className="divide-border divide-y">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      await onSelect(p);
                      onClose();
                    }}
                    className="hover:bg-primary-light/50 focus:bg-primary-light/60 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2 text-left text-sm transition-colors focus:outline-none"
                  >
                    <span className="text-text min-w-0 truncate font-semibold" title={p.name}>
                      {p.name}
                    </span>
                    <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
                      {p.voicePart || 'Unknown'}
                    </span>
                    <span className="text-muted bg-bg rounded-full px-2 py-0.5 text-xs font-medium">
                      {p.globalStatus}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-text-muted p-6 text-center text-sm">No {performerLabelPlural} found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
