/**
 * Utility for parsing last names from full name strings,
 * ensuring that common suffixes are preserved.
 */
export const getLastName = (fullName: string): string => {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;

  const suffixes = new Set(['Jr', 'Sr', 'II', 'III', 'IV', 'V', 'Jr.', 'Sr.']);
  const lastPart = parts[parts.length - 1];

  if (suffixes.has(lastPart) && parts.length > 2) {
    return `${parts[parts.length - 2]} ${lastPart}`;
  }

  return lastPart;
};
