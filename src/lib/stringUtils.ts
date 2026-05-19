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

/**
 * Returns the first name (everything before the parsed last name).
 */
export const getFirstName = (fullName: string): string => {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  const lastName = getLastName(trimmed);
  if (!lastName || trimmed === lastName) return '';
  // Remove last name from end
  const index = trimmed.lastIndexOf(lastName);
  if (index === -1) return '';
  return trimmed.substring(0, index).trim();
};

export interface HasName {
  id: string;
  name: string;
}

/**
 * Generates unique display names for a list of items sharing the HasName interface.
 * If multiple items have the same last name, it disambiguates by adding a comma
 * and prepending the minimum needed prefix of their first name to make them unique.
 */
export const getUniqueDisplayNames = <T extends HasName>(items: T[]): Record<string, string> => {
  const map: Record<string, string> = {};
  if (!items.length) return map;
  
  // Group items by last name (case-insensitive comparison)
  const byLastName: Record<string, T[]> = {};
  items.forEach(item => {
    const lastName = getLastName(item.name).toLowerCase();
    if (!byLastName[lastName]) {
      byLastName[lastName] = [];
    }
    byLastName[lastName].push(item);
  });

  // Process each group
  Object.values(byLastName).forEach(group => {
    if (group.length === 1) {
      const item = group[0];
      map[item.id] = getLastName(item.name);
      return;
    }

    // Determine the minimum prefix length of the first name to distinguish all items in the group
    const itemsWithFirst = group.map(item => ({
      item,
      firstName: getFirstName(item.name),
      lastName: getLastName(item.name)
    }));

    let prefixLen = 1;
    const maxFirstNameLen = Math.max(...itemsWithFirst.map(x => x.firstName.length), 0);

    while (prefixLen <= maxFirstNameLen) {
      const prefixes = itemsWithFirst.map(x => x.firstName.substring(0, prefixLen).toLowerCase());
      const uniquePrefixes = new Set(prefixes);
      if (uniquePrefixes.size === group.length) {
        break;
      }
      prefixLen++;
    }

    itemsWithFirst.forEach(x => {
      const prefix = x.firstName.substring(0, prefixLen);
      map[x.item.id] = prefix ? `${x.lastName}, ${prefix}` : x.lastName;
    });
  });

  return map;
};
