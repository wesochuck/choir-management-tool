// Section Palette Colors
export const PALETTE_COLORS = [
  'var(--section-red)',
  'var(--section-orange)',
  'var(--section-amber)',
  'var(--section-green)',
  'var(--section-cyan)',
  'var(--section-blue)',
  'var(--section-indigo)',
  'var(--section-purple)',
  'var(--section-pink)',
  'var(--section-slate)',
];

export function isColorTooClose(hex1: string, hex2: string): boolean {
  if (!hex1 || !hex2 || !hex1.startsWith('#') || !hex2.startsWith('#')) return false;
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);
  
  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);
  
  const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return distance < 60;
}

export function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'var(--color-text)';
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}
