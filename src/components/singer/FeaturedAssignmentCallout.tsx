import type { Event } from '../../services/eventService';
import { getSingerFeaturedAssignments } from '../../lib/eventUtils';

interface FeaturedAssignmentCalloutProps {
  event: Event;
  allEvents?: Event[];
  profileId?: string;
  compact?: boolean;
}

export function FeaturedAssignmentCallout({
  event,
  allEvents = [],
  profileId = '',
  compact = false,
}: FeaturedAssignmentCalloutProps) {
  const assignments = getSingerFeaturedAssignments(event, profileId, allEvents);
  if (assignments.length === 0) return null;

  const sourceEvent = assignments[0].sourceEvent;
  const inherited = sourceEvent.id !== event.id;

  return (
    <div
      className={`border-primary bg-primary-light/50 text-primary-deep rounded-md border-l-4 ${compact ? 'p-2 text-xs' : 'p-3 text-sm'}`}
      role="status"
    >
      <div className="font-semibold">
        <span aria-hidden="true">🎤</span> You’re assigned to perform
        {inherited ? ` in ${sourceEvent.title || 'the parent performance'}` : ''}
      </div>
      <ul className="m-0 mt-1 list-disc pl-5">
        {assignments.map(({ item, label }) => (
          <li key={item.id}>
            {label} — {item.title || 'Untitled Piece'}
          </li>
        ))}
      </ul>
    </div>
  );
}
