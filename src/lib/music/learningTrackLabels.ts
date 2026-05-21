/**
 * Derives the human-readable context label shown in the Learning Tracks upload header.
 * For a standalone piece: returns the piece title.
 * For a movement (child piece): returns "Parent Title – Movement Title".
 *
 * @param piece An object with at least a `title` string.
 * @param parentTitle Optional parent piece name (only present for child/movement pieces).
 * @returns A formatted context label string.
 */
export function getLearningTrackContextLabel(
  piece: { title: string },
  parentTitle?: string
): string {
  const movementTitle = piece.title.trim();
  const parent = parentTitle?.trim();
  if (parent) {
    return `${parent} – ${movementTitle}`;
  }
  return movementTitle;
}
