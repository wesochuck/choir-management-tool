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
 *
 * Padding classes (p-, px-, py-, pt-, pb-, pl-, pr-) are omitted from the
 * strip list — they are layout/spacing, not visual styling, consistent with
 * margin classes already passing through.
 */
const visualClassPrefixes = [
  'border',
  'rounded',
  'bg-',
  'text-',
  'shadow-',
  'outline-',
  'placeholder:',
  'focus:',
  'transition-',
  'ring-',
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

/**
 * Strip undefined values from a props object before passing to a Shoelace
 * Web Component. Shoelace crashes internally (in render()) when receiving
 * undefined for props it may iterate over (class lists, part suffixes,
 * option groups, etc.). This also protects against undefined values leaking
 * through {...rest} spreads.
 */
export function safeSlProps<T extends Record<string, unknown>>(props: T): T {
  const out: Record<string, unknown> = {};
  let needsFilter = false;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) {
      needsFilter = true;
    } else {
      out[key] = value;
    }
  }
  return (needsFilter ? out : props) as T;
}
