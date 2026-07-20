import type { SetListItem, SetListPerformerCredit } from '../../services/eventService';

export type SetListCreditCopyMode = 'include' | 'reset';

export function isFeaturedNumber(item: SetListItem): boolean {
  if (item.type === 'intermission') return false;
  return item.isFeaturedNumber ?? item.soloSmallGroup === true;
}

export function getPerformerCredits(item: SetListItem): SetListPerformerCredit[] {
  return Array.isArray(item.performerCredits)
    ? item.performerCredits.filter(
        (credit) =>
          credit && typeof credit.displayName === 'string' && credit.displayName.trim() !== ''
      )
    : [];
}

export function getFeaturedNumberLabel(item: SetListItem): string | null {
  if (!isFeaturedNumber(item)) return null;
  const count = getPerformerCredits(item).length;
  if (count === 0) return 'Featured Number';
  return count === 1 ? 'Solo' : 'Group';
}

export function formatFeaturedNumberCredit(item: SetListItem): string | null {
  const label = getFeaturedNumberLabel(item);
  if (!label) return null;
  const credits = getPerformerCredits(item);
  if (credits.length === 0) return `${label} — Performers TBA`;
  return `${label} — ${credits.map((credit) => credit.displayName).join(', ')}`;
}

export function migrateFeaturedNumberItem(
  item: SetListItem,
  isFeatured: boolean,
  performerCredits: SetListPerformerCredit[]
): SetListItem {
  const currentItem = { ...item };
  delete currentItem.soloSmallGroup;
  return {
    ...currentItem,
    isFeaturedNumber: isFeatured,
    performerCredits: isFeatured ? performerCredits : [],
  };
}

export function copySetListItems(
  items: SetListItem[],
  creditMode: SetListCreditCopyMode,
  createId: () => string = () => crypto.randomUUID()
): SetListItem[] {
  return items.map((item) => ({
    ...item,
    id: createId(),
    performerCredits:
      !isFeaturedNumber(item) || creditMode === 'reset'
        ? []
        : getPerformerCredits(item).map((credit) => ({ ...credit })),
  }));
}

export function hasProfileCredit(item: SetListItem, profileId: string): boolean {
  if (!profileId || !isFeaturedNumber(item)) return false;
  return getPerformerCredits(item).some(
    (credit) => credit.kind === 'profile' && credit.profileId === profileId
  );
}
