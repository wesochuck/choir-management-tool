import { Button } from '../../components/ui';
import { RsvpEventCard } from './RsvpEventCard';
import { RsvpRehearsalsList } from './RsvpRehearsalsList';
import { RsvpNoteSection } from './RsvpNoteSection';
import type { EventDetails, ProfileDetails } from './useRsvpData';

interface RsvpConfirmedViewProps {
  event: EventDetails;
  profile: ProfileDetails;
  rehearsals: EventDetails[];
  timezone: string;
  selectedRsvp: 'Yes' | 'No';
  rsvpNote: string;
  onNoteChange: (v: string) => void;
  handleConfirmRsvp: (rsvp: 'Yes' | 'No', note?: string) => Promise<void>;
  handleDownloadCalendar: () => void;
  isPending: boolean;
}

export function RsvpConfirmedView({
  event,
  profile,
  rehearsals,
  timezone,
  selectedRsvp,
  rsvpNote,
  onNoteChange,
  handleConfirmRsvp,
  handleDownloadCalendar,
  isPending,
}: RsvpConfirmedViewProps) {
  const isAttending = selectedRsvp === 'Yes';

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border flex flex-col items-center gap-1 border-b pb-4 text-center">
        <div
          className={`mb-1 flex size-20 items-center justify-center rounded-full text-5xl transition-all duration-300 ${isAttending ? 'bg-primary-light text-primary' : 'text-danger bg-red-100'}`}
        >
          {isAttending ? '✓' : '✗'}
        </div>
        <h1 className="text-primary-deep m-0 text-2xl font-extrabold">
          {isAttending ? 'Confirmed: Attending' : 'Confirmed: Not Attending'}
        </h1>
        <p className="text-text-muted m-0 text-sm">
          Thank you, <strong>{profile.name}</strong>. Your response has been securely recorded.
        </p>
      </div>

      <RsvpEventCard event={event} timezone={timezone} titleClass="text-xl font-bold" />

      <RsvpRehearsalsList rehearsals={rehearsals} timezone={timezone} />

      <div className="border-border flex flex-col gap-4 border-t pt-4">
        <RsvpNoteSection
          eventType={event.type}
          selectedRsvp={selectedRsvp}
          rsvpNote={rsvpNote}
          onNoteChange={onNoteChange}
          textareaClass="min-h-[80px]"
        />
        {event.type === 'Rehearsal' && selectedRsvp === 'No' && (
          <div className="flex items-center justify-between">
            <p className="text-text-muted m-0 text-xs">This note is visible to choir admins.</p>
            <Button
              onClick={() => handleConfirmRsvp('No')}
              disabled={isPending}
              variant="primary"
              size="small"
              className="font-bold"
            >
              {isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-label text-text-muted text-xs font-bold">
            Need to change your response?
          </label>

          <div className="border-border flex h-12 w-full rounded-xl border bg-[var(--primary-light,#f1f5f9)] p-1 max-sm:h-auto max-sm:flex-col max-sm:gap-2 max-sm:border-none max-sm:bg-transparent max-sm:p-0">
            <Button
              onClick={() => handleConfirmRsvp('Yes')}
              disabled={isPending}
              variant={isAttending ? 'primary' : 'outline'}
              className={`h-full flex-1 text-sm font-bold transition-all ${
                isAttending
                  ? 'shadow-[0_2px_8px_rgba(74,117,89,0.2)]'
                  : 'max-sm:border-border shadow-none max-sm:h-12 max-sm:rounded-lg max-sm:border max-sm:bg-[var(--border-light,#f8fafc)]'
              }`}
            >
              {isPending && isAttending ? 'Updating...' : 'I Will Attend'}
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
              variant={!isAttending ? 'danger' : 'outline'}
              className={`h-full flex-1 text-sm font-bold transition-all ${
                !isAttending
                  ? 'shadow-[0_2px_8px_rgba(239,68,68,0.2)]'
                  : 'max-sm:border-border shadow-none max-sm:h-12 max-sm:rounded-lg max-sm:border max-sm:bg-[var(--border-light,#f8fafc)]'
              }`}
            >
              {isPending && !isAttending ? 'Updating...' : 'I Cannot Attend'}
            </Button>
          </div>
        </div>

        <div className="text-text-muted mb-2 text-center text-xs">
          <span>
            Not <strong>{profile.name}</strong>?{' '}
          </span>
          <a href="/login" className="text-primary font-semibold underline">
            Sign in as yourself
          </a>
        </div>

        <div className="border-border flex w-full gap-2 border-t pt-4 max-sm:flex-col max-sm:items-stretch">
          {isAttending && (
            <Button
              onClick={handleDownloadCalendar}
              variant="secondary"
              className="flex-1 font-bold"
            >
              📅 Add to Calendar (.ics)
            </Button>
          )}
          <Button as="a" href="/login" variant="outline" className="flex-1 font-bold no-underline">
            Sign In to Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
