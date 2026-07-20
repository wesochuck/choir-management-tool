import { parseJsonField } from './hookJson';
import { escapeHtml } from './hookText';

interface SetlistItem {
  title: string;
  composer?: string;
  duration?: string;
  type?: string;
  isFeaturedNumber?: boolean;
  soloSmallGroup?: boolean;
  performerCredits?: Array<{ displayName?: string }>;
}

function formatPerformerCredit(item: SetlistItem): string {
  const featured =
    item.isFeaturedNumber !== undefined ? item.isFeaturedNumber : item.soloSmallGroup === true;
  if (!featured || item.type === 'intermission') return '';
  const credits = Array.isArray(item.performerCredits)
    ? item.performerCredits.filter(
        (credit) => credit && typeof credit.displayName === 'string' && credit.displayName.trim()
      )
    : [];
  if (credits.length === 0) return 'Featured Number — Performers TBA';
  const label = credits.length === 1 ? 'Solo' : 'Group';
  return `${label} — ${credits.map((credit) => credit.displayName!.trim()).join(', ')}`;
}

export function renderSetlistHtml(rawSetList: unknown, includePerformerCredits = true): string {
  const setList = parseJsonField<SetlistItem[]>(rawSetList);
  if (setList && setList.length > 0) {
    const rows = setList
      .map((item, i) => {
        const num = i + 1;
        const title =
          item.type === 'intermission'
            ? `<em>${escapeHtml(item.title)}</em>`
            : escapeHtml(item.title);
        const composer = escapeHtml(item.composer || '');
        const duration = escapeHtml(item.duration || '');
        const performerCredit = includePerformerCredits ? formatPerformerCredit(item) : '';
        const creditHtml = performerCredit
          ? `<div style="margin-top: 3px; color: #4a7c59; font-size: 0.85em; font-weight: 600;">${escapeHtml(performerCredit)}</div>`
          : '';
        return `<tr><td style="padding: 4px 8px; text-align: right; color: #666; font-size: 0.85em;">${num}.</td><td style="padding: 4px 8px;">${title}${creditHtml}</td><td style="padding: 4px 8px; color: #555; font-size: 0.9em;">${composer || '&nbsp;'}</td><td style="padding: 4px 8px; text-align: right; color: #888; font-size: 0.85em;">${duration || '&nbsp;'}</td></tr>`;
      })
      .join('');
    return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; border-collapse: collapse; font-family: sans-serif; font-size: 0.9em;"><thead><tr style="border-bottom: 2px solid #4a7c59;"><th style="padding: 6px 8px; text-align: right; color: #4a7c59; font-weight: 600; font-size: 0.8em; text-transform: uppercase;"></th><th style="padding: 6px 8px; text-align: left; color: #4a7c59; font-weight: 600; font-size: 0.8em; text-transform: uppercase;">Piece</th><th style="padding: 6px 8px; text-align: left; color: #4a7c59; font-weight: 600; font-size: 0.8em; text-transform: uppercase;">Composer</th><th style="padding: 6px 8px; text-align: right; color: #4a7c59; font-weight: 600; font-size: 0.8em; text-transform: uppercase;">Duration</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return '<div style="margin: 16px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif; font-size: 0.9em; color: #555;"><em>Program to be announced.</em></div>';
}
