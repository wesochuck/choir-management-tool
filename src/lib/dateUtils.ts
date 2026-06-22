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

export function parseFuzzyMonthYearInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2})\/?(\d{2}|\d{4})$/);
  if (!match) return '';
  const mm = match[1].padStart(2, '0');
  const yyyy = match[2].length === 2 ? `20${match[2]}` : match[2];
  return `${yyyy}-${mm}-01`;
}
