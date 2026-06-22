import { Button } from '../../components/ui';
import { RsvpEventCard } from './RsvpEventCard';
import { RsvpRehearsalsList } from './RsvpRehearsalsList';
import { RsvpNoteSection } from './RsvpNoteSection';
import type { EventDetails, ProfileDetails } from './useRsvpData';

interface RsvpUnconfirmedViewProps {
  event: EventDetails;
  profile: ProfileDetails;
  rehearsals: EventDetails[];
  timezone: string;
  selectedRsvp: 'Yes' | 'No';
  rsvpNote: string;
  onNoteChange: (v: string) => void;
  handleConfirmRsvp: (rsvp: 'Yes' | 'No', note?: string) => Promise<void>;
  isPending: boolean;
}

export function RsvpUnconfirmedView({
  event,
  profile,
  rehearsals,
  timezone,
  selectedRsvp,
  rsvpNote,
  onNoteChange,
  handleConfirmRsvp,
  isPending,
}: RsvpUnconfirmedViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-border flex flex-col items-center gap-1 border-b pb-4 text-center">
        <div className="mb-2 text-5xl">✉️</div>
        <h1 className="text-primary-deep m-0 text-2xl font-extrabold">Confirm Your RSVP</h1>
        <p className="text-text-muted m-0 text-sm">
          Hello <strong>{profile.name}</strong>, please confirm your attendance status below.
        </p>
      </div>

      <RsvpEventCard event={event} timezone={timezone} />

      <RsvpRehearsalsList rehearsals={rehearsals} timezone={timezone} />

      <div className="flex flex-col gap-3">
        <RsvpNoteSection
          eventType={event.type}
          selectedRsvp={selectedRsvp}
          rsvpNote={rsvpNote}
          onNoteChange={onNoteChange}
        />
        <p className="text-text-muted m-0 text-center text-xs">Are you planning to attend?</p>
        <div className="flex w-full gap-2">
          <Button
            onClick={() => handleConfirmRsvp('Yes')}
            disabled={isPending}
            variant="primary"
            className={`h-12 flex-1 font-bold ${selectedRsvp === 'Yes' ? 'border-primary-deep border-2 opacity-100' : 'border-border border opacity-60'}`}
          >
            {isPending && selectedRsvp === 'Yes' ? 'Confirming...' : 'Yes, I Will Attend'}
          </Button>
          <Button
            onClick={() => {
              if (event.type === 'Rehearsal' && selectedRsvp !== 'No') {
                /* will show note section on next render */
              } else {
                handleConfirmRsvp('No');
              }
            }}
            disabled={isPending}
            variant="danger"
            className={`h-12 flex-1 font-bold ${selectedRsvp === 'No' ? 'border-danger-text border-2 opacity-100' : 'border-border border opacity-60'}`}
          >
            {isPending && selectedRsvp === 'No'
              ? 'Confirming...'
              : event.type === 'Rehearsal' && selectedRsvp === 'No'
                ? 'Confirm RSVP Decline'
                : 'No, I Cannot Attend'}
          </Button>
        </div>
      </div>

      <div className="border-border text-text-muted border-t pt-4 text-center text-xs">
        <span>
          Not <strong>{profile.name}</strong>?{' '}
        </span>
        <a href="/login" className="text-primary font-semibold underline">
          Sign in as yourself
        </a>
        <span> or </span>
        <a href="mailto:admin@choir.org" className="text-primary font-semibold underline">
          Contact Admins
        </a>
      </div>
    </div>
  );
}
