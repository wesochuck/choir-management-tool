import { type CommunicationRecipient } from '../services/communicationService';
import { type Event } from '../services/eventService';

export const COMPLIANT_FOOTER_HTML = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9f0eb; font-family: sans-serif; font-size: 12px; color: #94a3b8; text-align: center;">
  <p style="margin: 0 0 10px 0;">{{MAILING_ADDRESS}}</p>
  <p style="margin: 0;">
    You are receiving this because you are an active member of the choir. 
    <br>
    <a href="{{UNSUBSCRIBE_LINK}}" style="color: #4a7c59; text-decoration: underline;">Unsubscribe from these emails</a>
  </p>
</div>
`;

/**
 * Renders a basic subset of Markdown to HTML.
 * Supports: Bold, Italic, Links, Unordered Lists, Line Breaks.
 * Note: This escapes raw HTML tags within the content for security.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** or __text__
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_match, text, url) => {
    // Basic sanitization to prevent javascript: XSS
    let safeUrl = url.trim();
    const isSafeProtocol = /^(https?|mailto):/i.test(safeUrl);
    if (!isSafeProtocol && !safeUrl.startsWith('/') && !safeUrl.startsWith('#')) {
      safeUrl = '#'; // Fallback for unsafe URLs
    }
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">${text}</a>`;
  });

  // Unordered Lists: * item or - item
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    const listMatch = line.match(/^(\*|-)\s+(.*)/);
    if (listMatch) {
      const content = listMatch[2];
      if (!inList) {
        inList = true;
        return `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else {
      if (inList) {
        inList = false;
        return `</ul>${line}`;
      }
      return line;
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');

  // Line breaks and paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks.map(block => {
    if (block.trim().startsWith('<ul')) return block;
    return `<p style="margin-bottom: 12px;">${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

/**
 * Resolves placeholders for message preview.
 * This can handle both raw text (for subjects) and rendered HTML (for body).
 */
export function resolvePreviewContent(
  content: string,
  event: Event | null,
  recipient: CommunicationRecipient | null,
  mailingAddress: string = '123 Choir St, Harmony City, HC 12345',
  escapeVariables: boolean = false
): string {
  if (!content) return '';

  let result = content;

  const escapeHtml = (str: string) => {
    if (!escapeVariables) return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Recipient Placeholders
  const name = escapeHtml(recipient?.name || 'Sample Singer');
  result = result.replace(/{singerName}/g, name);

  // Event Placeholders
  const title = escapeHtml(event?.title || event?.type || 'Sample Performance');
  const type = escapeHtml(event?.type || 'Performance');
  const date = escapeHtml(event ? new Date(event.date).toLocaleString() : new Date().toLocaleString());
  const location = escapeHtml(event?.expand?.venue?.name || 'Main Concert Hall');
  const details = escapeHtml(event?.details || 'Join us for an amazing evening of music and harmony!');

  result = result.replace(/{eventTitle}/g, title);
  result = result.replace(/{eventType}/g, type);
  result = result.replace(/{eventDate}/g, date);
  result = result.replace(/{eventLocation}/g, location);
  result = result.replace(/{eventDetails}/g, details);

  // RSVP Links - Injected as literal HTML
  const rsvpText = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <span style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</span>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
  `;
  result = result.replace(/{{RSVP_LINKS}}/g, rsvpText);
  result = result.replace(/{rsvpLinks}/g, rsvpText);

  // Compliance Placeholders
  result = result.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));
  result = result.replace(/{{UNSUBSCRIBE_LINK}}/g, '#');

  return result;
}

/**
 * Orchestrates the full rendering pipeline for the preview.
 * 1. Renders Markdown to HTML (and escapes raw HTML)
 * 2. Appends Compliance Footer
 * 3. Resolves Placeholders (including those that inject trusted HTML)
 */
export function getRenderedPreview(
  userContent: string,
  messageType: 'Email' | 'SMS' | 'Both',
  event: Event | null,
  recipient: CommunicationRecipient | null,
  mailingAddress: string
): string {
  // 1. Render Markdown first (escapes user input)
  let html = renderMarkdown(userContent);

  // 2. Append compliance footer if email
  if (messageType === 'Email' || messageType === 'Both') {
    html += COMPLIANT_FOOTER_HTML;
  }

  // 3. Resolve placeholders last (this allows trusted HTML like buttons to be injected)
  // We pass true to escapeVariables so user data doesn't introduce HTML injection.
  return resolvePreviewContent(html, event, recipient, mailingAddress, true);
}
