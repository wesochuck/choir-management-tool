interface CalendarEvent {
  id: string;
  title?: string;
  type: string;
  date: string;
  location?: string;
  expand?: {
    venue?: {
      name: string;
      address?: string;
    };
  };
  details?: string;
}

const escapeIcsText = (value = '') =>
  value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

const fmtUtc = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');

export const calendarUtils = {
  createICS(
    event: CalendarEvent,
    opts?: { durationHours?: number; prodId?: string; uid?: string; dtstamp?: Date }
  ) {
    const durationHours = opts?.durationHours ?? 2;
    const start = new Date(event.date);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const uid = opts?.uid ?? `event-${event.id}@choir-management-tool`;
    const dtstamp = opts?.dtstamp ?? new Date();
    const prodId = opts?.prodId ?? '-//Choir Management Tool//EN';

    const venueObj = event.expand?.venue;
    const locationName = venueObj
      ? venueObj.address
        ? `${venueObj.name}, ${venueObj.address}`
        : venueObj.name
      : event.location || '';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:${prodId}`,
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmtUtc(dtstamp)}`,
      `DTSTART:${fmtUtc(start)}`,
      `DTEND:${fmtUtc(end)}`,
      `SUMMARY:${escapeIcsText(event.title || event.type)}`,
      `LOCATION:${escapeIcsText(locationName)}`,
      `DESCRIPTION:${escapeIcsText(event.details || '')}`,
      'END:VEVENT',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  },

  generateICS(event: CalendarEvent) {
    const icsContent = calendarUtils.createICS(event);

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `event-${event.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
