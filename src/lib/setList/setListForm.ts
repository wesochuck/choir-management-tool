import type { SetListItem } from '../../services/eventService';

export interface SetListFormState {
  editingId: string | null;
  title: string;
  composer: string;
  duration: string;
  notes: string;
  pieceId: string;
  type: 'song' | 'intermission';
}

/**
 * Builds a SetListItem from the current form state.
 */
export function buildSetListItemFromFormState(state: SetListFormState): SetListItem {
  const { editingId, title, composer, duration, notes, pieceId, type } = state;

  return {
    id: editingId || crypto.randomUUID(),
    title: title.trim(),
    composer: type === 'song' ? composer.trim() || undefined : undefined,
    duration: duration.trim() || undefined,
    notes: notes.trim() || undefined,
    pieceId: type === 'song' ? pieceId || undefined : undefined,
    type,
  };
}

/**
 * Applies a saved item to the list of set list items.
 */
export function applySetListItemSave(
  items: SetListItem[],
  itemData: SetListItem,
  editingId: string | null
): SetListItem[] {
  if (editingId) {
    return items.map((i) => (i.id === editingId ? itemData : i));
  } else {
    return [...items, itemData];
  }
}

/**
 * Logic for whether a duration change should be synced back to the Music Library.
 */
export function shouldSyncDurationToLibrary(
  type: 'song' | 'intermission',
  pieceId: string | undefined
): boolean {
  // Sync duration changes to the Music Library if it is a linked song.
  // We return true even if duration is blank so the library can be cleared if intended.
  return type === 'song' && !!pieceId;
}
