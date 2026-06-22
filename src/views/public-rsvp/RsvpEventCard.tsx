import { formatInTimezone } from '../../lib/timezone';
import type { EventDetails } from './useRsvpData';

interface RsvpEventCardProps {
  event: EventDetails;
  timezone: string;
  titleClass?: string;
}

export function RsvpEventCard({ event, timezone, titleClass }: RsvpEventCardProps) {
  return (
    <div className="border-border flex flex-col gap-2 rounded-xl border bg-neutral-100 p-4 sm:p-5">
      <span
        className={`inline-flex items-center self-start rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${event.type === 'Performance' ? 'bg-danger-bg text-danger-text' : 'bg-primary-light text-primary-deep'}`}
      >
        {event.type}
      </span>
      <h2 className={`text-headline m-0 text-lg font-bold ${titleClass || ''}`}>
        {event.title || `${event.type} at ${event.expand?.venue?.name || 'Venue'}`}
      </h2>

      <div className="text-text-muted mt-1 flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <strong>
            {formatInTimezone(event.date, timezone, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </strong>
        </div>
        <div className="flex items-center gap-2">
          <span>⏰</span>
          <span>
            {formatInTimezone(event.date, timezone, { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span>📍</span>
          <span>
            <strong>{event.expand?.venue?.name || event.location}</strong>
            {event.expand?.venue?.address && (
              <span className="text-text-muted mt-0.5 block text-xs">
                {event.expand?.venue?.address}
              </span>
            )}
          </span>
        </div>
      </div>

      {event.details && (
        <div className="border-border text-text-muted mt-2.5 border-t pt-2.5 text-xs leading-relaxed whitespace-pre-wrap">
          {event.details}
        </div>
      )}
    </div>
  );
}
