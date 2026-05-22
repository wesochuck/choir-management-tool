export type FormationStrategyType = 'vertical_column' | 'horizontal_row';

export const calculateAutoPaint = (
  rowCounts: number[],
  sectionCounts: Record<string, number>,
  arg3: string[] | 'Column' | 'Row',
  arg4?: FormationStrategyType | string[]
): Record<string, string> => {
  let sectionOrder: string[] = [];
  let strategy: FormationStrategyType;

  if (Array.isArray(arg3)) {
    sectionOrder = arg3;
    strategy = (arg4 as FormationStrategyType) || 'vertical_column';
  } else {
    // Legacy fallback mapping
    strategy = arg3 === 'Row' ? 'horizontal_row' : 'vertical_column';
    sectionOrder = Array.isArray(arg4) ? arg4 : [];
  }

  const totalSingers = Object.values(sectionCounts).reduce((a, b) => a + b, 0);
  if (totalSingers === 0 || sectionOrder.length === 0 || rowCounts.length === 0) return {};

  const totalSeats = rowCounts.reduce((a, b) => a + b, 0);
  const suggestions: Record<string, string> = {};

  // Strategy A: Vertical Columns
  if (strategy === 'vertical_column') {
    let cumulative = 0;
    const boundaries: number[] = [0];
    sectionOrder.forEach((code) => {
      const count = sectionCounts[code] || 0;
      cumulative += count / totalSingers;
      boundaries.push(cumulative);
    });

    rowCounts.forEach((rowSize, rowIndex) => {
      for (let seatIndex = 0; seatIndex < rowSize; seatIndex++) {
        const positionInRow = (seatIndex + 0.5) / rowSize;
        for (let i = 0; i < sectionOrder.length; i++) {
          if (positionInRow >= boundaries[i] && positionInRow <= boundaries[i + 1]) {
            suggestions[`${rowIndex}-${seatIndex}`] = sectionOrder[i];
            break;
          }
        }
      }
    });
    return suggestions;
  }

  // Strategy B: Horizontal Rows (Continuous Block Spillover)
  let currentSectionIndex = 0;
  let remainingSingersInCurrentSection = sectionCounts[sectionOrder[0]] || 0;

  // Advance to the first section that contains active singers
  while (remainingSingersInCurrentSection === 0 && currentSectionIndex < sectionOrder.length - 1) {
    currentSectionIndex++;
    remainingSingersInCurrentSection = sectionCounts[sectionOrder[currentSectionIndex]] || 0;
  }

  let filledSeatsCount = 0;
  rowCounts.forEach((rowSize, rowIndex) => {
    for (let seatIndex = 0; seatIndex < rowSize; seatIndex++) {
      // Calculate target capacity weight thresholds
      const currentSeatTargetIndex = Math.floor((filledSeatsCount / totalSeats) * totalSingers);
      
      // Map index position linearly to section bounds
      let trackingSum = 0;
      let chosenSection = sectionOrder[sectionOrder.length - 1];
      
      for (let i = 0; i < sectionOrder.length; i++) {
        trackingSum += sectionCounts[sectionOrder[i]] || 0;
        if (currentSeatTargetIndex < trackingSum) {
          chosenSection = sectionOrder[i];
          break;
        }
      }
      
      suggestions[`${rowIndex}-${seatIndex}`] = chosenSection;
      filledSeatsCount++;
    }
  });

  return suggestions;
};
