import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { profileService, getProfileEmail } from '../../services/profileService';
import { pb } from '../../lib/pocketbase';
import { Input, Select, Spinner } from '../../components/ui';
import { AppCard } from '../../components/common/AppCard';
import { sortProfiles } from '../../lib/singerSort';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { queryKeys } from '../../lib/queryKeys';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';

export default function DirectoryView() {
  const [search, setSearch] = useState('');
  const [voicePart, setVoicePart] = useState('');
  const { voiceParts, labels: voicePartLabels } = useVoiceParts();

  const directoryQuery = useQuery({
    queryKey: queryKeys.profiles.directory(),
    queryFn: () => profileService.getDirectoryProfiles(),
  });

  const profiles = useMemo(() => directoryQuery.data ?? [], [directoryQuery.data]);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortProfiles(
      profiles.filter((profile) => {
        if (voicePart && profile.voicePart !== voicePart) return false;

        if (!normalizedSearch) return true;

        const email = getProfileEmail(profile).toLowerCase();
        const haystack = [profile.name, profile.voicePart, profile.phone, email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      }),
      'lastName',
      voicePartLabels
    );
  }, [profiles, search, voicePart, voicePartLabels]);

  if (directoryQuery.isLoading) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center gap-4">
        <Spinner size="large" />
        <span className="text-text-muted text-sm font-semibold">Loading singer directory...</span>
      </div>
    );
  }

  if (directoryQuery.error) {
    return (
      <AppCard className="border-danger-text/30 bg-danger-bg text-danger-text p-6 text-center">
        <p className="m-0 text-sm font-bold">
          Could not load singer directory. Please try again later.
        </p>
      </AppCard>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, voice part, phone, or email..."
          className="w-full"
        />

        <Select
          value={voicePart}
          onChange={(event) => setVoicePart(event.target.value)}
          className="sm:w-56"
        >
          <option value="">All voice parts</option>
          {voiceParts.map((part) => (
            <option key={part.label} value={part.label}>
              {part.label}
            </option>
          ))}
        </Select>
      </div>

      {filteredProfiles.length === 0 ? (
        <AppCard>
          <EmptyState
            icon="👥"
            title="No Matching Singers"
            description={
              search || voicePart
                ? 'Try adjusting your search query or voice part filter.'
                : 'No active singers are currently opted into the directory.'
            }
          />
        </AppCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const email = getProfileEmail(profile);
            const photoUrl = profile.photo ? pb.files.getURL(profile, profile.photo) : '';

            return (
              <AppCard key={profile.id} className="h-full">
                <div className="flex gap-4">
                  <div className="bg-primary-light text-primary-deep flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-bold">
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      profile.name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-text m-0 truncate text-base font-semibold">
                      {profile.name}
                    </h2>
                    <span className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {profile.voicePart || 'Singer'}
                    </span>

                    <div className="text-text-muted mt-4 flex flex-col gap-2 text-sm">
                      <div>
                        <span className="text-text font-semibold">Email: </span>
                        {email ? (
                          <a
                            href={`mailto:${email}`}
                            className="text-primary-deep break-all hover:underline"
                          >
                            {email}
                          </a>
                        ) : (
                          <span className="italic opacity-60">Not listed</span>
                        )}
                      </div>

                      <div>
                        <span className="text-text font-semibold">Phone: </span>
                        {profile.phone ? (
                          <a
                            href={`tel:${profile.phone}`}
                            className="text-primary-deep hover:underline"
                          >
                            {profile.phone}
                          </a>
                        ) : (
                          <span className="italic opacity-60">Not listed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
