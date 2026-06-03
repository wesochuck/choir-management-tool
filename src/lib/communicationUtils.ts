import { type CommunicationRecipient } from '../services/communicationService';
import { type Event } from '../services/eventService';
import { formatTime12h } from './dateUtils';

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
 * Supports: Bold, Italic, Links, Unordered Lists, Ordered Lists, Headings, Line Breaks.
 * Note: This escapes raw HTML tags within the content for security.
 */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
  html = html.replace(/^(#{1,6})\s+(.*)/gm, (_, hashes, content) => {
    const level = hashes.length;
    // Using inline styles for headings for better email client compatibility
    const fontSize = level === 1 ? '1.8rem' : level === 2 ? '1.5rem' : level === 3 ? '1.25rem' : '1.1rem';
    return `<h${level} style="margin: 16px 0 8px 0; line-height: 1.2; font-size: ${fontSize}; color: #2c3e50;">${content}</h${level}>`;
  });

  // Bold: **text** or __text__
  html = html.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  html = html.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, url) => {
    const sanitizedUrl = url.trim();
    if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
      return text;
    }
    const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
  });


  // Lists (Ordered and Unordered)
  const lines = html.split('\n');
  let inUl = false;
  let inOl = false;
  const processedLines = lines.map(line => {
    const ulMatch = line.match(/^(\*|-)\s+(.*)/);
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);

    if (ulMatch) {
      const content = ulMatch[2];
      let prefix = '';
      if (inOl) { inOl = false; prefix = '</ol>'; }
      if (!inUl) {
        inUl = true;
        return prefix + `<ul style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else if (olMatch) {
      const content = olMatch[2];
      let prefix = '';
      if (inUl) { inUl = false; prefix = '</ul>'; }
      if (!inOl) {
        inOl = true;
        return prefix + `<ol style="margin: 8px 0; padding-left: 20px;"><li>${content}</li>`;
      }
      return `<li>${content}</li>`;
    } else {
      let result = line;
      if (inUl) { inUl = false; result = '</ul>' + line; }
      if (inOl) { inOl = false; result = '</ol>' + line; }
      return result;
    }
  });
  if (inUl) processedLines.push('</ul>');
  if (inOl) processedLines.push('</ol>');
  html = processedLines.join('\n');

  // Line breaks and paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<ul')) return block;
    if (trimmed.startsWith('<ol')) return block;
    if (trimmed.match(/^<h\d/)) return block;
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
  pollQuestions: Record<string, string> = {},
  isHtml: boolean = false
): string {
  if (!content) return '';

  let result = content;

  // Recipient Placeholders
  const name = recipient?.name || 'Sample Singer';
  result = result.replace(/{singerName}/g, name);

  // Event Placeholders
  const title = event?.title || event?.type || 'Sample Performance';
  const type = event?.type || 'Performance';
  const date = event ? new Date(event.date).toLocaleString() : new Date().toLocaleString();
  const venueName = event?.expand?.venue?.name || 'Main Concert Hall';
  const venueAddress = event?.expand?.venue?.address || '';
  
  let location = venueName;
  if (isHtml && venueAddress.trim()) {
    location = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${venueName}</a>`;
  }

  const callTime = event?.callTime ? formatTime12h(event.callTime) : '';
  const details = event?.details || 'Join us for an amazing evening of music and harmony!';

  result = result.replace(/{eventTitle}/g, title);
  result = result.replace(/{eventType}/g, type);
  result = result.replace(/{eventDate}/g, date);
  result = result.replace(/{eventLocation}/g, location);
  result = result.replace(/{eventCallTime}/g, callTime);
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

  // Player Link - Injected as literal HTML preview
  const playerText = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <span style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</span>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
  `;
  result = result.replace(/{{PLAYER_LINK}}/g, playerText);
  result = result.replace(/{playerLink}/g, playerText);

  // Poll Links - Injected as literal HTML preview, using actual poll question if available
  const pollRegex = /{{POLL_LINK:([a-zA-Z0-9]+)}}/g;
  result = result.replace(pollRegex, (_, pollId: string) => {
    const question = pollQuestions[pollId] || 'Answer our quick question';
    return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <span style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${question}</span>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">(No login required)</p>
</div>
  `;
  });

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
  mailingAddress: string,
  pollQuestions: Record<string, string> = {}
): string {
  // 1. Render Markdown first (escapes user input)
  let html = renderMarkdown(userContent);

  // 2. Append compliance footer if email
  if (messageType === 'Email' || messageType === 'Both') {
    html += COMPLIANT_FOOTER_HTML;
  }

  // 3. Resolve placeholders last (this allows trusted HTML like buttons to be injected)
  return resolvePreviewContent(html, event, recipient, mailingAddress, pollQuestions, true);
}
