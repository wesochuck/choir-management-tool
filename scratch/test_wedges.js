
const sections = ['S', 'B', 'T', 'A'];
const partCounts = { S: 10, A: 5, T: 5, B: 5 }; // Total 25
const totalSingers = Object.values(partCounts).reduce((a, b) => a + b, 0);

console.log("Total Singers:", totalSingers);

let cumulative = 0;
const boundaries = [0];
sections.forEach(part => {
  const count = partCounts[part] || 0;
  cumulative += count / totalSingers;
  boundaries.push(cumulative);
});

console.log("Boundaries:", boundaries);

const rowSize = 15;
const rowSuggestions = [];
for (let seatIndex = 0; seatIndex < rowSize; seatIndex++) {
  const positionInRow = (seatIndex + 0.5) / rowSize;
  for (let i = 0; i < sections.length; i++) {
    if (positionInRow >= boundaries[i] && positionInRow <= boundaries[i+1]) {
      rowSuggestions.push(sections[i]);
      break;
    }
  }
}

console.log("Suggestions for row of 15:", rowSuggestions.join(', '));
