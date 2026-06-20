export const PUBLIC_FONT_OPTIONS = [
  {
    id: 'system',
    label: 'System Default',
    cssStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: 'serif',
    label: 'Classic Serif',
    cssStack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'modern-serif',
    label: 'Modern Serif',
    cssStack: '"Iowan Old Style", "Palatino Linotype", Palatino, serif',
  },
  {
    id: 'friendly-sans',
    label: 'Friendly Sans',
    cssStack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
  },
  {
    id: 'formal-sans',
    label: 'Formal Sans',
    cssStack: 'Arial, Helvetica, sans-serif',
  },
  {
    id: 'casual-handwritten',
    label: 'Casual Handwritten',
    cssStack: '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", casual, cursive',
  },
  {
    id: 'formal-script',
    label: 'Formal Script',
    cssStack: '"Brush Script MT", "Lucida Handwriting", "Apple Chancery", cursive',
  },
] as const;

export type PublicFontChoice = (typeof PUBLIC_FONT_OPTIONS)[number]['id'];

const DEFAULT_PUBLIC_FONT: PublicFontChoice = 'system';

export function getPublicFontStack(fontId: PublicFontChoice | undefined): string {
  return (
    PUBLIC_FONT_OPTIONS.find((option) => option.id === fontId)?.cssStack ??
    PUBLIC_FONT_OPTIONS.find((option) => option.id === DEFAULT_PUBLIC_FONT)!.cssStack
  );
}
