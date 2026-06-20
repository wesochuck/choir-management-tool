export function getNextMovementNumber(items: { title?: string }[]): number {
  let maxMovementNumber = 0;

  items.forEach((item) => {
    const title = item.title || '';
    const matches = title.match(/\d+/g);
    if (!matches) return;

    matches.forEach((match) => {
      const value = Number(match);
      if (Number.isFinite(value)) {
        maxMovementNumber = Math.max(maxMovementNumber, value);
      }
    });
  });

  return maxMovementNumber + 1;
}
