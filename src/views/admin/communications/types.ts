import type { Event } from '../../../services/eventService';
import type { CommunicationRecipient } from '../../../services/communicationService';

export type WizardStep = 'TARGETS' | 'TEMPLATE' | 'COMPOSE' | 'REVIEW';

export interface AutomatedTask {
  id: string;
  type: 'Reminder' | 'Report' | 'RSVP Request' | 'Ticket Buyer Reminder';
  event: Event;
  scheduledTime: Date;
  status: 'Scheduled' | 'Sent' | 'Archived';
  recipientCount?: number;
}

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
