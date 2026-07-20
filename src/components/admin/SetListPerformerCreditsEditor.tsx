import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { profileService } from '../../services/profileService';
import type { SetListPerformerCredit } from '../../services/eventService';
import { Button, Input, Spinner } from '../ui';

interface SetListPerformerCreditsEditorProps {
  credits: SetListPerformerCredit[];
  onChange: (credits: SetListPerformerCredit[]) => void;
  isOpen: boolean;
}

function displayRosterStatus(status: string): string {
  return status === 'Idle' ? 'On Break' : status;
}

export function SetListPerformerCreditsEditor({
  credits,
  onChange,
  isOpen,
}: SetListPerformerCreditsEditorProps) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  const [searchQuery, setSearchQuery] = useState('');
  const [guestName, setGuestName] = useState('');

  const profilesQuery = useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () => profileService.getProfiles(),
    enabled: isOpen,
  });

  const eligibleProfiles = useMemo(
    () => (profilesQuery.data ?? []).filter((profile) => profile.voicePart.trim() !== ''),
    [profilesQuery.data]
  );
  const profileMap = useMemo(
    () => new Map(eligibleProfiles.map((profile) => [profile.id, profile])),
    [eligibleProfiles]
  );
  const selectedProfileIds = useMemo(
    () =>
      new Set(credits.flatMap((credit) => (credit.kind === 'profile' ? [credit.profileId] : []))),
    [credits]
  );
  const availableProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return eligibleProfiles.filter((profile) => {
      if (selectedProfileIds.has(profile.id)) return false;
      if (!query) return true;
      return (
        profile.name.toLowerCase().includes(query) ||
        profile.voicePart.toLowerCase().includes(query) ||
        displayRosterStatus(profile.globalStatus).toLowerCase().includes(query)
      );
    });
  }, [eligibleProfiles, searchQuery, selectedProfileIds]);

  const moveCredit = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= credits.length) return;
    const next = [...credits];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  const addGuest = () => {
    const normalizedName = guestName.trim();
    if (!normalizedName) return;
    onChange([...credits, { kind: 'guest', displayName: normalizedName }]);
    setGuestName('');
  };

  return (
    <div className="border-border bg-bg/50 flex flex-col gap-4 rounded-lg border p-3">
      <div>
        <div className="text-text text-sm font-semibold">Performer Credits</div>
        <p className="text-text-muted m-0 mt-1 text-xs">
          One credit is shown as a Solo; two or more are shown as a Group. Leave empty for
          Performers TBA.
        </p>
      </div>

      {credits.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Performer billing order">
          {credits.map((credit, index) => {
            const profile = credit.kind === 'profile' ? profileMap.get(credit.profileId) : null;
            return (
              <li
                key={credit.kind === 'profile' ? `profile-${credit.profileId}` : `guest-${index}`}
                className="border-border bg-surface flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
              >
                <span className="text-text min-w-0 flex-1 truncate text-sm font-semibold">
                  {credit.displayName}
                </span>
                <span className="text-text-muted text-xs">
                  {credit.kind === 'guest'
                    ? 'Guest'
                    : profile
                      ? `${profile.voicePart} • ${displayRosterStatus(profile.globalStatus)}`
                      : 'No longer in roster'}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="tiny"
                    disabled={index === 0}
                    aria-label={`Move ${credit.displayName} up`}
                    onClick={() => moveCredit(index, index - 1)}
                  >
                    <span aria-hidden="true">↑</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="tiny"
                    disabled={index === credits.length - 1}
                    aria-label={`Move ${credit.displayName} down`}
                    onClick={() => moveCredit(index, index + 1)}
                  >
                    <span aria-hidden="true">↓</span>
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="tiny"
                    aria-label={`Remove ${credit.displayName}`}
                    onClick={() =>
                      onChange(credits.filter((_, creditIndex) => creditIndex !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="border-warning-border bg-warning-bg/60 text-warning-text rounded-md border border-dashed p-3 text-center text-sm font-medium">
          Featured Number — Performers TBA
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-label" htmlFor="set-list-performer-search">
          Add from {performerLabelPlural}
        </label>
        <Input
          id="set-list-performer-search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={`Search ${performerLabelPlural.toLowerCase()}...`}
        />
        {profilesQuery.isLoading ? (
          <div className="text-text-muted flex items-center justify-center gap-2 p-3 text-sm">
            <Spinner size="small" /> Loading roster...
          </div>
        ) : profilesQuery.error ? (
          <div className="text-danger-text p-3 text-center text-sm">Unable to load the roster.</div>
        ) : (
          <div className="border-border bg-surface max-h-52 overflow-y-auto rounded-md border">
            {availableProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="border-border hover:bg-primary-light/50 grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-0 border-b bg-transparent px-3 py-2 text-left last:border-b-0"
                onClick={() =>
                  onChange([
                    ...credits,
                    { kind: 'profile', profileId: profile.id, displayName: profile.name },
                  ])
                }
              >
                <span className="text-text min-w-0 truncate text-sm font-semibold">
                  {profile.name}
                </span>
                <span className="text-text-muted text-xs">
                  {profile.voicePart} • {displayRosterStatus(profile.globalStatus)}
                </span>
              </button>
            ))}
            {availableProfiles.length === 0 && (
              <div className="text-text-muted p-3 text-center text-sm">
                No matching {performerLabelPlural.toLowerCase()} available.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-label" htmlFor="set-list-guest-name">
          Add Guest
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="set-list-guest-name"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addGuest();
              }
            }}
            placeholder="Guest performer name"
            className="flex-1"
          />
          <Button type="button" variant="secondary" disabled={!guestName.trim()} onClick={addGuest}>
            + Add Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
