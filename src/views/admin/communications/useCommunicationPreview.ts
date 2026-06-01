import { useMemo } from 'react';
import type {
  CommunicationRecipient,
  MessageType,
  TemplateRecord,
} from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';
import {
  getRenderedPreview,
  resolvePreviewContent,
} from '../../../lib/communicationUtils';

interface UseCommunicationPreviewArgs {
  content: string;
  subject: string;
  editingTemplate: Partial<TemplateRecord> | null;
  messageType: MessageType;
  selectedRecipients: CommunicationRecipient[];
  events: Event[];
  eventId: string;
  commSettings: CommunicationSettings;
  pollQuestions: Record<string, string>;
}

export function useCommunicationPreview({
  content,
  subject,
  editingTemplate,
  messageType,
  selectedRecipients,
  events,
  eventId,
  commSettings,
  pollQuestions,
}: UseCommunicationPreviewArgs) {
  const previewHtml = useMemo(() => {
    const previewContent = editingTemplate ? editingTemplate.content : content;
    const previewType = editingTemplate ? editingTemplate.type : messageType;

    if (!previewContent) return '';

    const sampleRecipient = selectedRecipients[0] || null;
    const selectedEvent = events.find((event) => event.id === eventId) || null;

    return getRenderedPreview(
      previewContent,
      previewType as MessageType,
      selectedEvent,
      sampleRecipient,
      commSettings.mailingAddress,
      pollQuestions,
    );
  }, [
    content,
    editingTemplate,
    events,
    eventId,
    selectedRecipients,
    messageType,
    commSettings.mailingAddress,
    pollQuestions,
  ]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === eventId) || null,
    [events, eventId],
  );

  const previewRecipient = useMemo(
    () => selectedRecipients[0] || null,
    [selectedRecipients],
  );

  const renderedSubject = useMemo(
    () => resolvePreviewContent(subject, selectedEvent, previewRecipient),
    [subject, selectedEvent, previewRecipient],
  );

  const renderedSmsBody = useMemo(
    () => resolvePreviewContent(content, selectedEvent, previewRecipient),
    [content, selectedEvent, previewRecipient],
  );

  return {
    previewHtml,
    selectedEvent,
    previewRecipient,
    renderedSubject,
    renderedSmsBody,
  };
}
