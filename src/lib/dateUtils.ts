export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return timeStr;
  const hrs = parseInt(match[1], 10);
  const mins = match[2];
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const displayHrs = hrs % 12 || 12;
  return `${displayHrs}:${mins} ${ampm}`;
}
