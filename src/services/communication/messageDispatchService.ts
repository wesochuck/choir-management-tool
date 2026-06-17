import { pb } from '../../lib/pocketbase';
import type { MessageRecord, SendMessageInput, SendMessageResult } from './types';

export function encodeSmsBody(content: string): string {
  return encodeURIComponent(content.slice(0, 1500));
}

export async function sendBulkMessage(
  data: SendMessageInput,
  draftId?: string
): Promise<SendMessageResult> {
  // Always CREATE a new Sent record so the onRecordAfterCreateSuccess hook fires
  // reliably on PocketHost. When sending a draft, delete it first to avoid duplicates.
  if (draftId) {
    try {
      await pb.collection('messages').delete(draftId);
    } catch {
      // If the draft was already deleted or missing, proceed silently.
    }
  }

  const payload = {
    ...data,
    content: data.content,
    status: 'Sent' as const,
  };

  const message = await pb.collection('messages').create<MessageRecord>(payload);

  const mailtoUrl = ''; // Intentionally left blank. Email is dispatched securely on the server side.

  return { message, mailtoUrl };
}
