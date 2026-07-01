import { useState } from 'react';
import { formatInTimezone } from '../../lib/timezone';
import type { EventDetails } from './useRsvpData';
import { useChoirSettings } from '../../hooks/useDocumentTitle';

interface RsvpRehearsalsListProps {
  rehearsals: EventDetails[];
  timezone: string;
}

export function RsvpRehearsalsList({ rehearsals, timezone }: RsvpRehearsalsListProps) {
  const { performerLabel } = useChoirSettings();
  const [showRehearsals, setShowRehearsals] = useState(false);

  if (rehearsals.length === 0) return null;

  return (
    <div className="border-border mt-1 overflow-hidden rounded-xl border">
      <button
        onClick={() => setShowRehearsals(!showRehearsals)}
        className="flex w-full cursor-pointer items-center justify-between border-none bg-neutral-100 px-4 py-3 text-left"
      >
        <h3 className="text-label text-primary-deep m-0 text-xs font-extrabold tracking-wider uppercase">
          📅 Rehearsal Schedule ({rehearsals.length})
        </h3>
        <span
          className={`text-text-muted text-xs transition-transform ${showRehearsals ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {showRehearsals && (
        <div className="border-border bg-surface flex flex-col gap-2 border-t p-3">
          {rehearsals.map((reh) => {
            return (
              <div
                key={reh.id}
                className="border-border bg-bg flex items-center justify-between rounded-lg border p-2 px-3 text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">
                    {formatInTimezone(reh.date, timezone, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </span>
                  <span className="text-text-muted text-[0.7rem]">
                    📍 {reh.expand?.venue?.name || 'Rehearsal Venue'}
                  </span>
                </div>
                <span className="text-text-muted font-medium">
                  {formatInTimezone(reh.date, timezone, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <p className="text-text-muted m-0 mt-1 text-center text-xs">
            Need to report a rehearsal absence? Please use your {performerLabel.toLowerCase()} dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
