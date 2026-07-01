import { useSearchParams } from 'react-router-dom';
import { AppCard } from '../components/common/AppCard';
import { useDocumentTitle, useChoirSettings } from '../hooks/useDocumentTitle';
import { Button } from '../components/ui';
import { useRsvpData } from './public-rsvp/useRsvpData';
import { RsvpReadOnlyView } from './public-rsvp/RsvpReadOnlyView';
import { RsvpUnconfirmedView } from './public-rsvp/RsvpUnconfirmedView';
import { RsvpConfirmedView } from './public-rsvp/RsvpConfirmedView';

export default function PublicRsvpView() {
  const [searchParams] = useSearchParams();
  const rsvp = useRsvpData(searchParams);
  const { performerLabel } = useChoirSettings();

  useDocumentTitle(rsvp.event?.title ? `RSVP for ${rsvp.event.title}` : 'RSVP');

  if (rsvp.status === 'loading') {
    return (
      <div className="bg-primary-light flex min-h-screen w-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin text-4xl">🔄</div>
          <h2 className="text-primary-deep m-0 font-extrabold">Loading Secure RSVP Details...</h2>
          <p className="text-text-muted m-0">Preparing event context, please wait.</p>
        </div>
      </div>
    );
  }

  if (rsvp.status === 'error' || !rsvp.event || !rsvp.profile) {
    return (
      <div className="flex min-h-screen w-screen flex-col items-center justify-center bg-red-50">
        <AppCard className="w-full max-w-[min(440px,calc(100vw-32px))] border border-red-100 p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl">⚠️</div>
            <h2 className="m-0 font-extrabold text-red-800">RSVP Request Failed</h2>
            <p className="text-text-muted m-0 mt-1 leading-relaxed">{rsvp.errorMessage}</p>
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                as="a"
                href="/login"
                variant="primary"
                className="w-full font-bold no-underline"
              >
                Sign In to Member Portal
              </Button>
              <Button
                as="a"
                href="mailto:admin@choir.org"
                variant="outline"
                className="w-full font-bold no-underline"
              >
                📧 Contact Choir Admins
              </Button>
            </div>
          </div>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="bg-primary-light flex min-h-screen w-screen flex-col items-center justify-start px-4 py-6 sm:px-6 lg:py-8">
      <div className="m-auto w-full max-w-[540px]">
        <AppCard className="box-border flex w-full flex-col gap-6 border p-6">
          {rsvp.rsvpWindow.isReadOnly && (
            <div className="border-border rounded-lg border bg-neutral-100 p-4 shadow-sm transition-all duration-200 hover:shadow-md">
              <p className="text-text-muted m-0">{rsvp.rsvpWindow.reason}</p>
              {rsvp.event.type === 'Performance' && (
                <p className="text-text-muted m-0 mt-1 text-xs">
                  You can still report future rehearsal absences from your {performerLabel.toLowerCase()} dashboard.
                </p>
              )}
            </div>
          )}

          {!rsvp.rsvpWindow.canSubmit ? (
            <RsvpReadOnlyView
              event={rsvp.event}
              profile={rsvp.profile}
              rehearsals={rsvp.rehearsals}
              timezone={rsvp.timezone}
              dbRsvp={rsvp.dbRsvp}
              rsvpNote={rsvp.rsvpNote}
              handleDownloadCalendar={rsvp.handleDownloadCalendar}
            />
          ) : !rsvp.isConfirmed ? (
            <RsvpUnconfirmedView
              event={rsvp.event}
              profile={rsvp.profile}
              rehearsals={rsvp.rehearsals}
              timezone={rsvp.timezone}
              selectedRsvp={rsvp.selectedRsvp}
              rsvpNote={rsvp.rsvpNote}
              onNoteChange={rsvp.setRsvpNote}
              handleConfirmRsvp={rsvp.handleConfirmRsvp}
              isPending={rsvp.quickRsvpMutation.isPending}
            />
          ) : (
            <RsvpConfirmedView
              event={rsvp.event}
              profile={rsvp.profile}
              rehearsals={rsvp.rehearsals}
              timezone={rsvp.timezone}
              selectedRsvp={rsvp.selectedRsvp}
              rsvpNote={rsvp.rsvpNote}
              onNoteChange={rsvp.setRsvpNote}
              handleConfirmRsvp={rsvp.handleConfirmRsvp}
              handleDownloadCalendar={rsvp.handleDownloadCalendar}
              isPending={rsvp.quickRsvpMutation.isPending}
            />
          )}
        </AppCard>
      </div>
    </div>
  );
}
