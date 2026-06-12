import type { NavigateFunction } from 'react-router-dom';
import type { Event } from '../../../services/eventService';
import type { Venue } from '../../../services/venueService';
import {
  renderCommunicationTemplate,
  type CommunicationSettings,
} from '../../../services/settingsService';
import { formatInTimezone } from '../../../lib/timezone';

interface EventCommunicationTemplateValues extends Record<string, string> {
  eventTitle: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
  eventDetails: string;
  singerName: string;
  rsvpLinks: string;
  playerLink: string;
}

export function getEventVenueName(event: Event, venues: Venue[]): string {
  return event.venue
    ? venues.find((venue) => venue.id === event.venue)?.name || 'TBD'
    : 'TBD';
}

function buildEventCommunicationTemplateValues(args: {
  event: Event;
  venues: Venue[];
  timezone: string;
}): EventCommunicationTemplateValues {
  const { event, venues, timezone } = args;

  return {
    eventTitle: event.title || event.type,
    eventType: event.type,
    eventDate: formatInTimezone(event.date, timezone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    eventLocation: getEventVenueName(event, venues),
    eventDetails: event.details || '',
    singerName: '{singerName}',
    rsvpLinks: '{{RSVP_LINKS}}',
    playerLink: '{{PLAYER_LINK}}',
  };
}

export function buildEventReminderDraft(args: {
  event: Event;
  venues: Venue[];
  timezone: string;
  communicationSettings: CommunicationSettings;
}): {
  initialEventId: string;
  initialSubject: string;
  initialContent: string;
} {
  const values = buildEventCommunicationTemplateValues({
    event: args.event,
    venues: args.venues,
    timezone: args.timezone,
  });

  return {
    initialEventId: args.event.id,
    initialSubject: renderCommunicationTemplate(
      args.communicationSettings.reminderSubjectTemplate,
      values,
    ),
    initialContent: renderCommunicationTemplate(
      args.communicationSettings.reminderBodyTemplate,
      values,
    ),
  };
}

export function navigateToCommunicationDraft(args: {
  navigate: NavigateFunction;
  event: Event;
  venues: Venue[];
  timezone: string;
  communicationSettings: CommunicationSettings;
}): void {
  const draft = buildEventReminderDraft({
    event: args.event,
    venues: args.venues,
    timezone: args.timezone,
    communicationSettings: args.communicationSettings,
  });

  args.navigate('/admin/communications', {
    state: draft,
  });
}
