/**
 * Pure formatting logic for document titles.
 * Used by the useDocumentTitle hook to build "PageTitle - Choir Name".
 */
export function formatDocumentTitle(pageTitle: string, choirName: string): string {
  const trimmedPage = pageTitle.trim();
  const trimmedChoir = choirName.trim();

  if (trimmedPage && trimmedChoir) {
    return `${trimmedPage} - ${trimmedChoir}`;
  }
  if (trimmedPage) {
    return trimmedPage;
  }
  if (trimmedChoir) {
    return trimmedChoir;
  }
  return 'Choir Manager';
}
