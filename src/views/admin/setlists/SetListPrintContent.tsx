import type { Event } from '../../../services/eventService';
import type { SetListDisplayRow } from '../../../lib/setList/setListItems';
import { formatInTimezone } from '../../../lib/timezone';
import { Divider } from '../../../components/ui';
import { formatFeaturedNumberCredit } from '../../../lib/setList/performerCredits';

interface SetListPrintContentProps {
  selectedEvent: Event | null | undefined;
  itemsWithDetails: SetListDisplayRow[];
  timezone: string;
  includePerformerCredits?: boolean;
}

export function SetListPrintContent({
  selectedEvent,
  itemsWithDetails,
  timezone,
  includePerformerCredits = true,
}: SetListPrintContentProps) {
  if (!selectedEvent) return null;

  return (
    <>
      <div className="mb-6 text-center">
        <h2 className="mb-1 text-2xl font-bold text-gray-900">
          {selectedEvent.title || selectedEvent.type}
        </h2>
        <p className="text-sm text-gray-600">
          {formatInTimezone(selectedEvent.date, timezone, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {' at '}
          {formatInTimezone(selectedEvent.date, timezone, {
            hour: 'numeric',
            minute: '2-digit',
          })}
          {selectedEvent.expand?.venue?.name && ` | ${selectedEvent.expand.venue.name}`}
        </p>
      </div>
      <Divider />
      <div className="flex flex-col gap-2">
        {(() => {
          let songIndex = 1;
          return itemsWithDetails.map((item) => {
            if (item.type === 'intermission') {
              return (
                <div
                  key={item.id}
                  className="my-2 border-y border-dashed border-gray-300 py-2 text-center text-base font-bold text-gray-600"
                >
                  {item.displayTitle || 'Intermission'}
                </div>
              );
            }
            const featuredCredit = includePerformerCredits
              ? formatFeaturedNumberCredit(item)
              : null;
            const el = (
              <div key={item.id} className="border-b border-gray-100 py-1">
                <div className="flex items-baseline justify-between gap-4 text-lg">
                  <span className="font-medium text-gray-900">
                    {songIndex}. {item.displayTitle}
                  </span>
                  {item.displayComposer && (
                    <span className="text-right text-base text-gray-600 italic">
                      {item.displayComposer}
                    </span>
                  )}
                </div>
                {featuredCredit && (
                  <div className="pl-5 text-sm font-semibold text-gray-700">{featuredCredit}</div>
                )}
              </div>
            );
            songIndex++;
            return el;
          });
        })()}
      </div>
    </>
  );
}
