import type { TemplateRecord } from '../../../services/communicationService';
import type { CommunicationFilters } from '../../../services/communicationService';

export function getValidTemplatesForAudience(
  templates: TemplateRecord[],
  filters: CommunicationFilters
): TemplateRecord[] {
  const hasEvent = !!filters.eventId;
  const audiences = filters.targetAudiences || [];
  const hasMembers = audiences.includes('Members');
  const hasTicketBuyers = audiences.includes('Ticket Buyers');

  return templates.filter((tpl) => {
    const text = `${tpl.subject} ${tpl.content}`;

    // 1. Event Placeholders require an Event
    const requiresEvent =
      text.includes('{event') ||
      text.includes('{{RSVP_LINKS}}') ||
      text.includes('{{PLAYER_LINK}}');
    if (requiresEvent && !hasEvent) {
      return false;
    }

    // 2. Member Placeholders require the Members audience
    const requiresMembers =
      text.includes('{{RSVP_LINKS}}') ||
      text.includes('{{PLAYER_LINK}}') ||
      text.includes('{{POLL_LINK:');
    if (requiresMembers && !hasMembers) {
      return false;
    }

    // 3. Ticket Placeholders require the Ticket Buyers audience
    const requiresTicketBuyers =
      text.includes('{{TICKET_QR}}') ||
      text.includes('{{TICKET_BUTTON}}') ||
      text.includes('{ticketQuantity}') ||
      text.includes('{totalCost}');
    if (requiresTicketBuyers && !hasTicketBuyers) {
      return false;
    }

    return true;
  });
}
