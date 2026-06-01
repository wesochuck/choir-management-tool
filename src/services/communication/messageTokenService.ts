import { pb } from '../../lib/pocketbase';
import { settingsService } from '../settingsService';
import type { CommunicationRecipient } from './types';

export async function resolveRsvpPlaceholders(
  content: string,
  eventId: string,
  recipients: CommunicationRecipient[]
): Promise<{ previewContent: string; logs: string[] }> {
  if (!content.includes('{{RSVP_LINKS}}') || !eventId || recipients.length === 0) {
    return { previewContent: content, logs: [] };
  }

  try {
    const { tokens } = await pb.send('/api/generate-rsvp-tokens', {
      method: 'POST',
      body: { eventId, profileIds: recipients.map((r) => r.id) },
    });

    const commSettings = await settingsService.getCommunicationSettings();
    const baseUrl = commSettings.frontendUrl || window.location.origin;

    const firstRecipient = recipients[0];
    const token = tokens[firstRecipient.id];
    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;

    const previewContent = content.replace(
      '{{RSVP_LINKS}}',
      `(RSVP Link for ${firstRecipient.name})\nLink: ${rsvpLink}\n(No login required)`
    );

    const logs = recipients.map((r) => {
      const t = tokens[r.id];
      return `Personalized Link for ${r.name}: ${baseUrl}/rsvp?token=${encodeURIComponent(t)}`;
    });

    return { previewContent, logs };
  } catch (err) {
    console.error('Failed to generate RSVP tokens', err);
    return {
      previewContent: content.replace('{{RSVP_LINKS}}', '(Error generating RSVP links)'),
      logs: [],
    };
  }
}

export async function resolvePollPlaceholders(
  content: string,
  recipients: CommunicationRecipient[]
): Promise<{ previewContent: string; logs: string[] }> {
  const pollRegex = /{{POLL_LINK:([a-zA-Z0-9]+)}}/g;
  const matches = [...content.matchAll(pollRegex)];

  if (matches.length === 0 || recipients.length === 0) {
    return { previewContent: content, logs: [] };
  }

  let previewContent = content;
  const logs: string[] = [];

  try {
    const commSettings = await settingsService.getCommunicationSettings();
    const baseUrl = commSettings.frontendUrl || window.location.origin;

    const results = await Promise.all(
      matches.map(async (match) => {
        const fullPlaceholder = match[0];
        const pollId = match[1];

        const { tokens } = await pb.send('/api/generate-poll-tokens', {
          method: 'POST',
          body: { pollId, profileIds: recipients.map((r) => r.id) },
        });

        const firstRecipient = recipients[0];
        const token = tokens[firstRecipient.id];
        const pollLink = `${baseUrl}/poll?token=${encodeURIComponent(token)}`;

        const replacement = `(Poll Link for ${firstRecipient.name})\nLink: ${pollLink}\n(No login required)`;

        const localLogs = recipients.map((r) => {
          const t = tokens[r.id];
          return `Personalized Poll Link (${pollId}) for ${r.name}: ${baseUrl}/poll?token=${encodeURIComponent(
            t
          )}`;
        });

        return { fullPlaceholder, replacement, localLogs };
      })
    );

    for (const res of results) {
      previewContent = previewContent.replace(res.fullPlaceholder, res.replacement);
      logs.push(...res.localLogs);
    }

    return { previewContent, logs };
  } catch (err) {
    console.error('Failed to generate poll tokens', err);
    return { previewContent: content.replace(pollRegex, '(Error generating poll links)'), logs: [] };
  }
}
