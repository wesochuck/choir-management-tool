/**
 * Resolves a catalog lookup URL given a template and a piece's catalog ID.
 * @param template The configured URL template containing `{catalogId}`.
 * @param catalogId The piece's catalog ID.
 * @returns The resolved URL, or null if template or catalogId is empty/invalid.
 */
export function resolveCatalogLookupUrl(
  template: string | undefined,
  catalogId: string | undefined
): string | null {
  if (!template || !catalogId) return null;
  const trimmedTemplate = template.trim();
  const trimmedId = catalogId.trim();
  if (!trimmedTemplate || !trimmedId) return null;

  return trimmedTemplate.replace(/{catalogId}/g, encodeURIComponent(trimmedId));
}
