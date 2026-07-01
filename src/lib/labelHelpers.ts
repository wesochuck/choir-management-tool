export function pluralizeLabel(label: string): string {
  if (!label) return 'Performers';
  return `${label}s`;
}
