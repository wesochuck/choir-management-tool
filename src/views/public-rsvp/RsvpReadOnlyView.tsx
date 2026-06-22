import { Button } from '../../components/ui';
import { RsvpEventCard } from './RsvpEventCard';
import { RsvpRehearsalsList } from './RsvpRehearsalsList';
import type { EventDetails, ProfileDetails } from './useRsvpData';

interface RsvpReadOnlyViewProps {
  event: EventDetails;
  profile: ProfileDetails;
  rehearsals: EventDetails[];
  timezone: string;
  dbRsvp: 'Yes' | 'No' | 'Pending';
  rsvpNote: string;
  handleDownloadCalendar: () => void;
}

export function RsvpReadOnlyView({
  event,
  profile,
  rehearsals,
  timezone,
  dbRsvp,
  rsvpNote,
  handleDownloadCalendar,
}: RsvpReadOnlyViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-border flex flex-col items-center gap-1 border-b pb-4 text-center">
        <div className="mb-2 text-5xl">📅</div>
        <h1 className="text-primary-deep m-0 text-2xl font-extrabold">RSVP Details</h1>
        <p className="text-text-muted m-0 text-sm">
          Hello <strong>{profile.name}</strong>, the details for this event are shown below.
        </p>
      </div>

      <RsvpEventCard event={event} timezone={timezone} />

      <RsvpRehearsalsList rehearsals={rehearsals} timezone={timezone} />

      <div className="border-border bg-surface rounded-lg border p-4 text-center shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="text-text-muted text-xs font-bold tracking-wider uppercase">
          Your response
        </div>
        <div
          className={`mt-2 text-xl font-extrabold ${dbRsvp === 'Yes' ? 'text-primary-deep' : dbRsvp === 'No' ? 'text-danger' : 'text-gray-500'}`}
        >
          {dbRsvp === 'Yes' ? 'Attending' : dbRsvp === 'No' ? 'Declining' : 'No response recorded'}
        </div>
        {dbRsvp === 'No' && rsvpNote && (
          <div className="border-border text-text-muted mt-3 border-t pt-2 text-left text-sm">
            <strong>Note:</strong> {rsvpNote}
          </div>
        )}
      </div>

      <div className="border-border flex w-full gap-2 border-t pt-4">
        {dbRsvp === 'Yes' && (
          <Button onClick={handleDownloadCalendar} variant="secondary" className="flex-1 font-bold">
            📅 Add to Calendar (.ics)
          </Button>
        )}
        <Button as="a" href="/login" variant="outline" className="flex-1 font-bold no-underline">
          Sign In to Portal
        </Button>
      </div>
    </div>
  );
}
