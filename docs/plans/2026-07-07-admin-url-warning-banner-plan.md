# Admin URL Warning Banner — Implementation Plan

Show a dismissible warning banner on the admin dashboard when either the `frontendUrl` (Communication Settings) or `homepageUrl` (Public Website Settings) is empty or doesn't match the current site origin.

---

## Proposed Changes

### Task 1: Pure URL comparison helpers

#### [NEW] `src/lib/urlCompare.ts`

```ts
export function normalizeOrigin(url: string): string
```
Parses URL via `new URL(...)` wrapped in `try/catch`, returns `protocol + hostname + port` (e.g. `https://app.mychoir.org:443`). Returns `''` on parse failure, including malformed strings, relative paths, and any `new URL()` throw.

```ts
export function originMismatchWarning(
  storedUrl: string,
  currentOrigin: string
): { isMissing: boolean; mismatchedOrigin: string | null }
```
- `storedUrl` empty → `{ isMissing: true, mismatchedOrigin: null }`
- `normalizeOrigin(storedUrl) !== currentOrigin` → `{ isMissing: false, mismatchedOrigin: normalizeOrigin(storedUrl) }`
- Match → `{ isMissing: false, mismatchedOrigin: null }`

Zero dependencies, pure functions only.

---

### Task 2: Raw stored-frontend-url getter

#### [MODIFY] `src/services/settings/communicationSettings.ts`

Add new export:

```ts
export async function getStoredFrontendUrl(): Promise<string> {
  const setting = await getSetting<CommunicationSettings>('communications');
  return setting?.value?.frontendUrl ?? '';
}
```

This reads the raw stored value **before** the `window.location.origin` fallback in `getCommunicationSettings()`.

---

### Task 3: Query keys

#### [MODIFY] `src/lib/queryKeys.ts`

Add under the existing `settings` key:

```ts
settings: {
  roster: ['settings', 'roster'] as const,
  homepageUrl: ['settings', 'homepageUrl'] as const,
  storedFrontendUrl: ['settings', 'storedFrontendUrl'] as const,
},
```

---

### Task 4: Alert Shoelace wrapper

#### [NEW] `src/components/ui/Alert/Alert.tsx`

Shoelace `<SlAlert>` wrapper following `Button.tsx` / `Spinner.tsx` pattern.

**Props:**
- `variant: 'warning' | 'danger' | 'info' | 'success'` (default: `'warning'`)
- `closable?: boolean` — show dismiss button
- `children?: ReactNode`
- `className?: string`
- `onDismiss?: () => void` — called after dismiss animation

**Test mode** (`process.env.NODE_ENV === 'test'`): renders `<div role="alert">` with Tailwind classes:
- warning: `bg-amber-50 border-amber-400 text-amber-900`
- danger: `bg-red-50 border-red-400 text-red-900`
- info: `bg-blue-50 border-blue-400 text-blue-900` (visually consistent with Shoelace's `primary` variant)
- success: `bg-emerald-50 border-emerald-400 text-emerald-900`

**Production:** renders `<SlAlert>` with `safeSlProps`. Variant mapping:
- `warning` → `'warning'`
- `danger` → `'danger'`
- `info` → `'primary'`
- `success` → `'success'`

When `closable`, render a close button. Wire `onSlAfterHide` → `onDismiss`.

#### [NEW] `src/components/ui/Alert/Alert.test.ts`

- renders `<div role="alert">` in test mode
- applies per-variant classes
- `closable` renders dismiss button
- clicking dismiss fires `onDismiss`

#### [MODIFY] `src/components/ui/index.ts`

Add: `export { Alert } from './Alert/Alert';`

---

### Task 5: URL mismatch hook

#### [NEW] `src/hooks/useUrlMismatchWarnings.ts`

Uses TanStack Query (`useQuery`) to fetch both URLs, compares against `window.location.origin`.

**Returns:**

```ts
interface UrlWarning {
  key: 'frontendUrl' | 'homepageUrl';
  type: 'missing' | 'mismatch';
  storedValue: string;
  settingsPath: string;
}

interface UseUrlMismatchWarningsReturn {
  warnings: UrlWarning[];
  dismiss(key: string): void;
  isLoading: boolean;
}
```

- `settingsPath`: `'/admin/communications'` for frontendUrl, `'/admin/website'` for homepageUrl
- Dismiss writes `sessionStorage.setItem('dismissed-url-warning-' + key, '1')`
  - Uses `sessionStorage` (not `localStorage`) so the warning reappears after browser restart, preventing permanent dismissal of a configuration error
- Filters out warnings with matching sessionStorage key
- Both queries use `staleTime: Infinity` since these settings rarely change and will be invalidated when the settings pages are saved
- Returns `warnings` as empty array when loading or error

#### [NEW] `src/hooks/useUrlMismatchWarnings.test.tsx`

`// @vitest-environment jsdom`, `afterEach(cleanup)`, `QueryClientProvider` wrapper.

Mock `getStoredFrontendUrl` and `getHomepageUrl`. Test cases:
- Both URLs empty → 2 missing warnings
- Both match → 0 warnings
- FrontendUrl mismatched, homepageUrl empty → 1 mismatch + 1 missing
- After `dismiss('frontendUrl')` → frontendUrl warning filtered out

---

### Task 6: Wire banner into dashboard

#### [MODIFY] `src/views/admin/AdminDashboardView.tsx`

- Import `useUrlMismatchWarnings` and `Alert` and `Link`
- Call `useUrlMismatchWarnings()` in component body
- After the existing error banner (after `</div>` at line ~289), render warning banners:

```tsx
{warnings.length > 0 && warnings.map((w) => (
  <div key={w.key} className="mx-auto mb-2 w-full max-w-[1200px] px-6">
    <Alert variant="warning" closable onDismiss={() => dismiss(w.key)}>
      <span className="flex items-center gap-2">
        <strong>URL Warning:</strong>
        {w.type === 'missing'
          ? `The ${w.key === 'frontendUrl' ? 'Frontend URL' : 'Homepage URL'} is not set.`
          : `The ${w.key === 'frontendUrl' ? 'Frontend URL' : 'Homepage URL'} is set to "${
              w.storedValue
            }" which does not match the current site origin.`}
        {' '}<Link to={w.settingsPath} className="underline font-semibold whitespace-nowrap">
          Update in settings →
        </Link>
      </span>
    </Alert>
  </div>
))}
```

---

### Task 7: Verification

```bash
rtk npx vitest run src/components/ui/Alert/Alert.test.ts
rtk npx vitest run src/hooks/useUrlMismatchWarnings.test.tsx
rtk npx vitest run src/views/admin/AdminDashboardView.tsx  # if tests exist
rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0
```

---

## Dependencies / Risks

- None. All new code, no schema changes, no migration files.
- Shoelace `SlAlert` wrapping follows the same pattern as `Button` and `Spinner`.
- `getStoredFrontendUrl` is a targeted addition that does not change existing `getCommunicationSettings` behavior.
- Hook tests need jsdom and `afterEach(cleanup)`.
