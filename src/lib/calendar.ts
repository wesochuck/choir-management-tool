interface CalendarEvent {
  id: string;
  title?: string;
  type: string;
  date: string;
  location: string;
  details?: string;
}

export const calendarUtils = {
  createICS(event: CalendarEvent, durationHours = 2) {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${format(start)}`,
      `DTEND:${format(end)}`,
      `SUMMARY:${event.title || event.type}`,
      `LOCATION:${event.location}`,
      `DESCRIPTION:${event.details}`,
      'END:VEVENT',
      'END:VCALENDAR'
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
  }
};
