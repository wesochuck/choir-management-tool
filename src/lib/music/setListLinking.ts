import type { SetListItem } from '../../services/eventService';

/**
 * Links a set list item in a list of items to a specific music library piece ID.
 * @param items The current list of set list items.
 * @param itemId The ID of the set list item to link.
 * @param pieceId The ID of the created/selected music library piece.
 * @returns A new array of set list items with the specified item linked, or the original array if not found.
 */
export function linkSetListItemToPiece(
  items: SetListItem[],
  itemId: string,
  pieceId: string
): SetListItem[] {
  return items.map(item => 
    item.id === itemId ? { ...item, pieceId } : item
  );
}

/**
 * Appends a music piece to a set list if it is not already present in the set list.
 * @param setList The existing set list array (can be undefined).
 * @param piece The music piece details to append.
 * @returns An object containing:
 *  - updated: boolean indicating if a new item was appended
 *  - setList: the updated set list array
 */
export function appendPieceToSetList(
  setList: SetListItem[] | undefined,
  piece: { id: string; title: string; composer?: string; duration?: string; notes?: string }
): { updated: boolean; setList: SetListItem[] } {
  const currentList = setList ? [...setList] : [];
  
  // Check if a set list item already references this pieceId
  const alreadyExists = currentList.some(item => item.pieceId === piece.id);
  if (alreadyExists) {
    return { updated: false, setList: currentList };
  }

  const newItem: SetListItem = {
    id: crypto.randomUUID(),
    pieceId: piece.id,
    title: piece.title,
    composer: piece.composer || '',
    duration: piece.duration || '',
    notes: '', // Notes are specific to the performance and initialized to empty
    type: 'song'
  };

  currentList.push(newItem);
  return { updated: true, setList: currentList };
}
