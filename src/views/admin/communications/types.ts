import type { Event } from '../../../services/eventService';
import type { CommunicationFilters, CommunicationRecipient } from '../../../services/communicationService';

export type WizardStep = 'TARGETS' | 'COMPOSE' | 'REVIEW';

export interface AutomatedTask {
  id: string;
  type: 'Reminder' | 'Report' | 'RSVP Request';
  event: Event;
  scheduledTime: Date;
  status: 'Scheduled' | 'Sent';
  recipientCount?: number;
}

export const DEFAULT_FILTERS: CommunicationFilters = {
  eventId: '',
  rsvp: 'All',
  voiceParts: [],
  globalStatus: 'Active',
};

export interface CommunicationRouteState {
  initialRecipients?: CommunicationRecipient[];
  initialSubject?: string;
  initialContent?: string;
  initialEventId?: string;
  initialOpenReview?: boolean;
  returnToPolls?: boolean;
  openDraftId?: string;
  initialPollQuestions?: Record<string, string>;
}
