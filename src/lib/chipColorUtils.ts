/** Stable Tailwind class palette for chip colors, cycling through hues */
export const CHIP_CLASSES = [
  'bg-[#1b4d3e]/10 border-[#1b4d3e]/30 text-[#1b4d3e]', // forest
  'bg-blue-500/10 border-blue-500/30 text-blue-800', // blue
  'bg-purple-500/10 border-purple-500/30 text-purple-600', // purple
  'bg-orange-600/10 border-orange-600/30 text-orange-700', // orange
  'bg-pink-500/10 border-pink-500/30 text-pink-700', // pink
  'bg-teal-500/10 border-teal-500/30 text-teal-700', // teal
  'bg-amber-500/10 border-amber-500/30 text-amber-700', // amber
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-700', // indigo
];

export function getChipClass(index: number): string {
  return CHIP_CLASSES[index % CHIP_CLASSES.length];
}
