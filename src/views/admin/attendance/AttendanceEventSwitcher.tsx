import { formatInTimezone } from '../../../lib/timezone';
import { MusicalNoteIcon, ChevronDownIcon } from '../../../components/ui/icons';

interface EventDef {
  id: string;
  type: string;
  date: string;
  expand?: {
    venue?: { name: string };
  };
}

interface AttendanceEventSwitcherProps {
  selectedEvent: EventDef;
  sortedEvents: EventDef[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  eventStats: Record<string, { present: number; expected: number }>;
  showSwitcher: boolean;
  setShowSwitcher: (v: boolean) => void;
  timezone: string;
  moduleLoadTime: number;
}

export function AttendanceEventSwitcher({
  selectedEvent,
  sortedEvents,
  selectedEventId,
  setSelectedEventId,
  eventStats,
  showSwitcher,
  setShowSwitcher,
  timezone,
  moduleLoadTime,
}: AttendanceEventSwitcherProps) {
  const formatDate = (dateStr: string) =>
    formatInTimezone(dateStr, timezone, { month: 'short', day: 'numeric' });

  const formatTime = (dateStr: string) =>
    formatInTimezone(dateStr, timezone, { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <div
        onClick={() => setShowSwitcher(!showSwitcher)}
        className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 hover:bg-gray-50"
        aria-expanded={showSwitcher}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setShowSwitcher(!showSwitcher);
          }
        }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <MusicalNoteIcon className="h-5 w-5 text-blue-600" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {selectedEvent.type} · {formatDate(selectedEvent.date)}
          </p>
          <p className="truncate text-xs text-gray-500">
            {selectedEvent.expand?.venue?.name || 'Unknown Venue'} ·{' '}
            {formatTime(selectedEvent.date)}
          </p>
        </div>

        <ChevronDownIcon
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showSwitcher ? 'rotate-180' : ''}`}
        />
      </div>

      {showSwitcher && (
        <div className="max-h-[300px] overflow-y-auto border-b border-gray-100 bg-gray-50 px-4 py-3">
          <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
            Switch to
          </p>
          <ul className="flex flex-col gap-1">
            {sortedEvents.map((ev) => {
              const stats = eventStats[ev.id] || { present: 0, expected: 0 };
              const isCompleted = new Date(ev.date).getTime() < moduleLoadTime;
              const isActive = ev.id === selectedEventId;
              return (
                <li
                  key={ev.id}
                  onClick={() => {
                    setSelectedEventId(ev.id);
                    setShowSwitcher(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    isActive ? 'border border-gray-200 bg-white shadow-sm' : 'hover:bg-gray-100'
                  }`}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedEventId(ev.id);
                      setShowSwitcher(false);
                    }
                  }}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isCompleted ? 'bg-teal-500' : 'bg-gray-300'
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {ev.type} · {formatDate(ev.date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ev.expand?.venue?.name || 'Unknown Venue'} · {formatTime(ev.date)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isCompleted
                        ? 'border border-teal-100 bg-teal-50 text-teal-800'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? `${stats.present}/${stats.expected}` : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
