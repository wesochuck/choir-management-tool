import { sanitizeHtmlTemplateData } from './hookText';

export interface AttendanceReportData {
  eventTitle: string;
  eventDate: string;
  attendanceRate: number | string;
  presentCount: number;
  totalCount: number;
  mailingAddress: string;
  exceededLimitListHtml?: string;
  performerLabelPlural?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Renders the HTML body for the attendance report email.
 */
export function renderAttendanceReportBody(data: AttendanceReportData): string {
  const safe = sanitizeHtmlTemplateData(data);
  const pluralLabel = data.performerLabelPlural || 'Performers';

  let exceededLimitSection = '';
  if (data.exceededLimitListHtml) {
    exceededLimitSection = `\n### ${pluralLabel} Exceeding Rehearsal Miss Limit\n${data.exceededLimitListHtml}`;
  }

  return `
## Attendance Report

**Event**: ${safe.eventTitle}  
**Date**: ${safe.eventDate}  
**Attendance Rate**: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)
${exceededLimitSection}
`.trim();
}
