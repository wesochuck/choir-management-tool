import { getSetting, upsertSetting } from './core';

export interface TicketConfirmationPageSettings {
  successMessage: string;
  pendingMessage: string;
  willCallInstructions: string;
  qrInstructions: string;
}

const DEFAULT_TICKET_CONFIRMATION_SETTINGS: TicketConfirmationPageSettings = {
  successMessage: 'Your purchase has been successfully processed.',
  pendingMessage:
    'We could not load the full ticket details yet. Your purchase may still be processing. Please refresh this page in a moment, or contact the box office if this continues.',
  willCallInstructions:
    'A confirmation email has been sent with a link back to this page. Your tickets will be held at Will Call on show day. Please bring a photo ID matching the buyer\u2019s name.',
  qrInstructions:
    'Print or screenshot this entire page and bring it with you. We also sent a confirmation email with a link back to this page.',
};

export async function getTicketConfirmationPageSettings(): Promise<TicketConfirmationPageSettings> {
  const stored = await getSetting<TicketConfirmationPageSettings>('ticket_confirmation_page');
  return { ...DEFAULT_TICKET_CONFIRMATION_SETTINGS, ...stored?.value };
}

export async function saveTicketConfirmationPageSettings(
  value: TicketConfirmationPageSettings
): Promise<void> {
  await upsertSetting('ticket_confirmation_page', value, true);
}
