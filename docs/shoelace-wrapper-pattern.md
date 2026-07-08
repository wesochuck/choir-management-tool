# Shoelace Wrapper Pattern — Deep Dive

Detailed reference for building new Shoelace (`@shoelace-style/shoelace`) wrappers under `src/components/ui/`. See `AGENTS.md` §3 "Shoelace and Web Components" for the mandatory rules; this document expands on the canonical `Button` wrapper.

---

## How the `Button` wrapper works (canonical pattern)

`src/components/ui/Button/Button.tsx` has three code paths:

- **Test mode** (`process.env.NODE_ENV === 'test'`): renders a plain `<button>` or `<Component>` with Tailwind classes. Shoelace is completely bypassed.
- **`as={Link}` or any non-button element**: renders the requested component with Tailwind classes. No Shoelace.
- **Production button** (`Component === 'button'`): renders `<SlButton>` from Shoelace.

When creating new Shoelace-wrapped components, follow this same test-vs-production duality so tests work in jsdom without Web Component registration.

---

## Gotchas

- **Shoelace errors are NOT caught by React Error Boundaries.** Shoelace renders inside its own Shadow DOM. A crash like `Cannot read properties of undefined (reading 'length')` at `zs.render` is a Shoelace internal error — the root cause is almost always a prop the React wrapper passed as `undefined` or `null` that Shoelace expected to be iterable. Check the wrapper's prop mapping, not Shoelace's internals.

- **Shoelace variant names differ from the app's conventions.** `SlButton` expects `'primary' | 'neutral' | 'danger'`, not `'secondary'`. The wrapper handles this mapping (`slVariant` at `Button.tsx:71`). New wrappers must map their own values.

- **jsdom does not fully support Custom Elements or Shadow DOM.** Components using Shoelace directly can't render correctly in tests. Always test through the React wrapper or gate Shoelace rendering behind `process.env.NODE_ENV === 'test'`.

- **Do not pass `undefined` or `null` children to Shoelace components.** Shoelace may iterate over `this.children` internally. An empty string or fragment is safer.

- **Shoelace `SlButton` drops the `form` attribute.** The React adapter does not forward `form="some-id"` to the inner `<button>`. Never rely on `type="submit" form="..."` on a Shoelace `<Button>` when the button sits outside the `<form>` (e.g., inside a `Modal` footer).

- **Do not use `requestSubmit()` as a workaround.** `document.getElementById('id')?.requestSubmit()` is fragile — it can silently fail because Shoelace form validation runs inside Shadow DOM and validation errors may not propagate correctly across the boundary. The correct pattern is to call the component's submit handler directly from the button's `onClick`. Make the handler's event parameter optional so it works from both contexts:

  ```tsx
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    // ... save logic
  };

  // In the form (Enter key still works):
  <form onSubmit={handleSubmit}>...</form>

  // In the Modal footer (button outside <form>):
  <Button onClick={() => handleSubmit()}>Save</Button>
  ```

- **Shoelace `SlButton` props pass through React first, then Lit's lifecycle.** React sets the attribute/property, then Lit's `updated()` runs. Timing issues can cause double renders. Use the wrapper's `className` / `variant` / `size` props rather than raw Shoelace attributes.
