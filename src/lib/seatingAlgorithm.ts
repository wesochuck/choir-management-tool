export type VoicePart = 'S' | 'A' | 'T' | 'B';

export const calculateAutoPaint = (
  rowCounts: number[],
  partCounts: Record<VoicePart, number>,
  sections: VoicePart[],
): Record<string, VoicePart> => {
  const totalSingers = Object.values(partCounts).reduce((a, b) => a + b, 0);
  if (totalSingers === 0 || sections.length === 0) return {};

  let cumulative = 0;
  const boundaries: number[] = [0];
  sections.forEach((part) => {
    const count = partCounts[part] || 0;
    cumulative += count / totalSingers;
    boundaries.push(cumulative);
  });

  const suggestions: Record<string, VoicePart> = {};

  rowCounts.forEach((rowSize, rowIndex) => {
    for (let seatIndex = 0; seatIndex < rowSize; seatIndex++) {
      const positionInRow = (seatIndex + 0.5) / rowSize;
      for (let i = 0; i < sections.length; i++) {
        if (positionInRow >= boundaries[i] && positionInRow <= boundaries[i + 1]) {
          suggestions[`${rowIndex}-${seatIndex}`] = sections[i];
          break;
        }
      }
    }
  });

  return suggestions;
};
