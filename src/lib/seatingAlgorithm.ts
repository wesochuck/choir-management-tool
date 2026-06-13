type FormationStrategyType = 'vertical_column' | 'horizontal_row';

export const calculateAutoPaint = (
  rowCounts: number[],
  sectionCounts: Record<string, number>,
  arg3: string[] | 'Column' | 'Row',
  arg4?: FormationStrategyType | string[]
): Record<string, string> => {
  let sectionOrder: string[];
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

  // Strategy A: Vertical Columns (Perfect Wedge Alignment + Active-Singer-First Compacting)
  if (strategy === 'vertical_column') {
    // 1. Allocate totalSingers to rows proportionally
    const rowActiveCounts = rowCounts.map((rowSize) => {
      return Math.round(rowSize * (totalSingers / totalSeats));
    });

    // Adjust rowActiveCounts so the sum matches totalSingers exactly
    let sumActive = rowActiveCounts.reduce((a, b) => a + b, 0);
    while (sumActive !== totalSingers) {
      if (sumActive < totalSingers) {
        // Find a row that is not fully active and has the largest capacity remaining
        let bestRowIdx = -1;
        let maxRem = -1;
        for (let i = 0; i < rowCounts.length; i++) {
          const rem = rowCounts[i] - rowActiveCounts[i];
          if (rem > 0 && rem > maxRem) {
            maxRem = rem;
            bestRowIdx = i;
          }
        }
        if (bestRowIdx === -1) break; // Safety break
        rowActiveCounts[bestRowIdx]++;
        sumActive++;
      } else {
        // Find a row with active seats that can be reduced
        let bestRowIdx = -1;
        let maxActive = -1;
        for (let i = 0; i < rowCounts.length; i++) {
          if (rowActiveCounts[i] > 0 && rowActiveCounts[i] > maxActive) {
            maxActive = rowActiveCounts[i];
            bestRowIdx = i;
          }
        }
        if (bestRowIdx === -1) break; // Safety break
        rowActiveCounts[bestRowIdx]--;
        sumActive--;
      }
    }

    // 2. Identify all active seats and calculate their visually centered x coordinates
    interface ActiveSeat {
      rowIndex: number;
      seatIndex: number;
      x: number;
    }
    const activeSeats: ActiveSeat[] = [];

    rowCounts.forEach((rowSize, rowIndex) => {
      const activeCount = rowActiveCounts[rowIndex];
      if (activeCount <= 0) return;

      // Center the active seats in this row
      const startIndex = Math.floor((rowSize - activeCount) / 2);
      const endIndex = startIndex + activeCount - 1;

      const midpoint = (rowSize - 1) / 2;
      for (let seatIndex = startIndex; seatIndex <= endIndex; seatIndex++) {
        activeSeats.push({
          rowIndex,
          seatIndex,
          x: seatIndex - midpoint,
        });
      }
    });

    // 3. Sort all active seats grid-wide from left to right (visual stage alignment)
    activeSeats.sort((a, b) => {
      const diff = a.x - b.x;
      if (Math.abs(diff) < 0.001) {
        return a.rowIndex - b.rowIndex;
      }
      return diff;
    });

    // 4. Assign sections sequentially in the sorted active seats order
    let seatCursor = 0;
    sectionOrder.forEach((code) => {
      const count = sectionCounts[code] || 0;
      for (let k = 0; k < count; k++) {
        if (seatCursor >= activeSeats.length) break;
        const seat = activeSeats[seatCursor];
        suggestions[`${seat.rowIndex}-${seat.seatIndex}`] = code;
        seatCursor++;
      }
    });

    return suggestions;
  }

  // Strategy B: Horizontal Rows (Continuous Block Spillover)
  // The formation editor displays sectionOrder top-to-bottom matching the grid's
  // visual top-to-bottom (back-to-front). sectionOrder[0] = back, last = front.
  // Grid: rowIndex 0 = Front (bottom), highest rowIndex = Back (top).
  // We iterate rows from back (highest) to front (0) so sectionOrder[0] fills
  // the back rows first. Within each row, seats fill left-to-right from the
  // director's perspective (seatIndex 0 → N). Overspill continues left-to-right.

  let filledSeatsCount = 0;
  // Iterate rows from back (highest index) to front (index 0)
  for (let ri = rowCounts.length - 1; ri >= 0; ri--) {
    const rowSize = rowCounts[ri];
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
      
      suggestions[`${ri}-${seatIndex}`] = chosenSection;
      filledSeatsCount++;
    }
  }

  return suggestions;
};
