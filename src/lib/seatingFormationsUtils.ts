/**
 * Collapses the current accordion item if clicked again, or switches to the newly clicked item.
 */
export function toggleAccordion(currentExpandedId: string | null, clickedId: string): string | null {
  return currentExpandedId === clickedId ? null : clickedId;
}
