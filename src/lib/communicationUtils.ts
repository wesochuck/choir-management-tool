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

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;">$1</a>');

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
  escapeValues: boolean = false
): string {
  if (!content) return '';

  let result = content;
  const processVal = (val: string) => escapeValues ? escapeHtml(val) : val;

  // Recipient Placeholders
  const name = recipient?.name || 'Sample Singer';
  result = result.replace(/{singerName}/g, processVal(name));

  // Event Placeholders
  const title = event?.title || event?.type || 'Sample Performance';
  const type = event?.type || 'Performance';
  const date = event ? new Date(event.date).toLocaleString() : new Date().toLocaleString();
  const location = event?.expand?.venue?.name || 'Main Concert Hall';
  const details = event?.details || 'Join us for an amazing evening of music and harmony!';

  result = result.replace(/{eventTitle}/g, processVal(title));
  result = result.replace(/{eventType}/g, processVal(type));
  result = result.replace(/{eventDate}/g, processVal(date));
  result = result.replace(/{eventLocation}/g, processVal(location));
  result = result.replace(/{eventDetails}/g, processVal(details));

  // RSVP Links - Injected as literal HTML
  const rsvpText = `
    <div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center;">
      <span style="display: inline-block; padding: 8px 16px; background-color: #4a7c59; color: white; border-radius: 4px; font-weight: bold;">Yes, I'm attending</span>
      <span style="display: inline-block; padding: 8px 16px; background-color: #ef4444; color: white; border-radius: 4px; font-weight: bold;">No, I can't make it</span>
    </div>
  `;
  result = result.replace(/{{RSVP_LINKS}}/g, rsvpText);
  result = result.replace(/{rsvpLinks}/g, rsvpText);

  // Compliance Placeholders
  result = result.replace(/{{MAILING_ADDRESS}}/g, mailingAddress);
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
  // We pass escapeValues = true here because the output is going into dangerouslySetInnerHTML
  return resolvePreviewContent(html, event, recipient, mailingAddress, true);
}
