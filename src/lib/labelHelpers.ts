export function pluralizeLabel(label: string): string {
  if (!label) return 'Singers';
  return `${label}s`;
}
