/**
 * Strip visual classes from a className string before forwarding to a
 * Shoelace (SlX) web component. SlX components ship with their own visual
 * styling — border, background, text color, shadow, ring, etc. — so the
 * consuming app should not override those with the same primitives. Layout
 * classes (flex, grid, w-, h-, m-, p-, gap-, size-, etc.) still pass through
 * because they position the host element rather than restyle it.
 *
 * The native test path (and the visuallyHidden path in Select) intentionally
 * uses the full className: native inputs and the bare overlay need every
 * primitive the consumer supplies.
 */
const visualClassPrefixes = [
  'border', 'rounded', 'bg-', 'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-',
  'text-', 'shadow-', 'outline-', 'placeholder:', 'focus:', 'transition-', 'ring-',
];

export function layoutOnly(className?: string): string | undefined {
  if (!className) return undefined;
  const remaining = className
    .split(/\s+/)
    .filter((c) => c.length > 0)
    .filter((c) => !visualClassPrefixes.some((prefix) => c.startsWith(prefix)))
    .join(' ');
  return remaining || undefined;
}
