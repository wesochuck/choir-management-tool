import { type Event } from '../services/eventService';

export const calendarUtils = {
  generateICS(event: Event) {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours

    const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${format(start)}`,
      `DTEND:${format(end)}`,
      `SUMMARY:${event.type}: Choir Performance/Rehearsal`,
      `LOCATION:${event.location}`,
      `DESCRIPTION:${event.details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `event-${event.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
