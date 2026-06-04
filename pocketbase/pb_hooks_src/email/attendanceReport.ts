
import { sanitizeHtmlTemplateData } from './hookText';

export interface AttendanceReportData {
    eventTitle: string;
    eventDate: string;
    attendanceRate: string;
    presentCount: number;
    totalCount: number;
    mailingAddress: string;
    exceededLimitListHtml?: string;
}

/**
 * Renders the HTML body for the attendance report email.
 */
export function renderAttendanceReportBody(data: AttendanceReportData): string {
    const safe = sanitizeHtmlTemplateData(data);
    const exceededLimitSection = data.exceededLimitListHtml ? `
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 20px 0;" />
    <h3 style="color: #b45309; margin-top: 0;">Singers Exceeding Rehearsal Miss Limit</h3>
    ${data.exceededLimitListHtml}
    ` : '';

    return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
    <h2>Attendance Report</h2>
    <p>Event: ${safe.eventTitle}</p>
    <p>Date: ${safe.eventDate}</p>
    <p>Attendance Rate: ${safe.attendanceRate}% (${safe.presentCount}/${safe.totalCount} present)</p>
    ${exceededLimitSection}
    <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
    <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        <p style="margin: 0 0 10px 0;">${safe.mailingAddress}</p>
        <p>Choir Management Tool</p>
    </div>
</div>
`;
}
