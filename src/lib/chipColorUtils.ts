/** Stable HSL palette for chip colors, cycling through hues */
export const CHIP_COLORS = [
    { bg: 'rgba(27, 77, 62, 0.10)', border: 'rgba(27, 77, 62, 0.30)', text: '#1b4d3e' },     // forest
    { bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.30)', text: '#1e40af' },   // blue
    { bg: 'rgba(168, 85, 247, 0.10)', border: 'rgba(168, 85, 247, 0.30)', text: '#7c3aed' },   // purple
    { bg: 'rgba(234, 88, 12, 0.10)', border: 'rgba(234, 88, 12, 0.30)', text: '#c2410c' },     // orange
    { bg: 'rgba(236, 72, 153, 0.10)', border: 'rgba(236, 72, 153, 0.30)', text: '#be185d' },   // pink
    { bg: 'rgba(20, 184, 166, 0.10)', border: 'rgba(20, 184, 166, 0.30)', text: '#0f766e' },   // teal
    { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.30)', text: '#b45309' },   // amber
    { bg: 'rgba(99, 102, 241, 0.10)', border: 'rgba(99, 102, 241, 0.30)', text: '#4338ca' },   // indigo
];

export function getChipColor(index: number) {
    return CHIP_COLORS[index % CHIP_COLORS.length];
}
