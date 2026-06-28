# Admin Singer Directory Toggle

## Overview

Add an admin-configurable toggle to enable/disable the Singer Directory feature
for singers. When disabled, the directory route and nav button are hidden from
singers; admins retain preview access.

## Why

Currently the Singer Directory at `/directory` is always available to any
authenticated user. Choir administrators need a way to turn it off (temporarily
or permanently) without changing code or affecting the per-profile
`showInDirectory` preferences.

## Design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Toggle scope | Singers only | Admins always have preview access |
| Enforcement | UI only | Front-end gate, no server hook |
| Singer UX when off | Route hidden entirely | Redirect to `/dashboard`; nav button disappears |
| Default value | Enabled (`true`) | Backward compatible |
| Storage | New `directorySettings` JSON key in `appSettings` | Matches `landingSettings` / `rosterSettings` pattern |
| Setting visibility | `isPublic: true` | Singers need to read it; `appSettings` listRule requires `isPublic` for non-admin reads |
| Setting UI location | Global SettingsView (`/admin/settings`) | No existing admin directory view; cross-cutting toggle |
| Migration | None | Row lazily created on first admin save (same as `landingSettings`) |

## Data model

A new record in the `appSettings` collection:

| Field | Value |
|---|---|
| `key` | `"directorySettings"` |
| `value` | `{ "enabled": true }` |
| `isPublic` | `true` |

TypeScript type:

```ts
interface DirectorySettings {
  enabled: boolean; // default true when unset
}
```

## Architecture

### Service layer

New file `src/services/settings/directorySettings.ts`:

- `getDirectorySettings()` — wraps `getSetting('directorySettings')`, returns
  `{ enabled: true }` fallback when `null`.
- `saveDirectorySettings(value)` — wraps `upsertSetting('directorySettings',
  value, true)`.
- Both exports from `src/services/settingsService.ts`.

### Query key

Add `'directory'` to `queryKeys.appSettings` in `src/lib/queryKeys.ts`.

### Admin SettingsView (`/admin/settings`)

Insert a new card "Singer Directory" in
`src/views/admin/SettingsView.tsx`:

- Single `Checkbox` labeled "Enable Singer Directory" bound to
  `directorySettings.enabled`.
- Included in the existing `saveSettingsMutation` `Promise.all` and
  `calculateSettingsDirty` dirty-state check, so the `FloatingSaveBar` handles
  it like choir name / timezone / logo.

Pattern to follow: `LandingPageSettingsPanel.tsx:289-296`
(checkbox) + `SettingsView.tsx:58-77` (save flow).

### Singer routing

**Route wrapper** — New small component `DirectoryRoute` in
`src/App.tsx` (or a standalone file):

```tsx
function DirectoryRoute() {
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.appSettings.directory,
    queryFn: () => settingsService.getDirectorySettings(),
    staleTime: 5 * 60_000,
  });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isLoading) return <Spinner />;
  if (!settings?.enabled && !isAdmin) return <Navigate to="/dashboard" replace />;
  return <DirectoryView />;
}
```

The route wrapper sits inside `<ProtectedRoute>`, so the user is guaranteed
authenticated. The wrapper only redirects singers (non-admins) when disabled.
Admins always get through.

Used as the element for `path="/directory"` in `src/App.tsx`.

**Singer dashboard button** — In `src/views/singer/DashboardView.tsx:188-189`,
add a `useQuery` for `directorySettings` and hide the "Singer Directory" button
when `enabled === false`. The query cache is shared with the route wrapper, so
after the first load it's instant.

**Admin dashboard** — The directory entry in
`AdminDashboardView.tsx:20-26` remains visible regardless of the setting
(admins preview the directory).

### Singer profile `showInDirectory` toggle

Left unchanged. The per-profile opt-out persists independently; it's harmless
while the feature is disabled, and singers retain their preference for when the
admin re-enables it.

## Files changed

| File | Change |
|---|---|
| `src/services/settings/directorySettings.ts` | **New** — `getDirectorySettings`, `saveDirectorySettings`, types |
| `src/services/settingsService.ts` | Re-export directory settings |
| `src/lib/queryKeys.ts` | Add `'directory'` to `appSettings` query keys |
| `src/views/admin/SettingsView.tsx` | Add directory toggle card, wire into save/dirty checks |
| `src/App.tsx` | Wrap `/directory` route with `DirectoryRoute` gate |
| `src/views/singer/DashboardView.tsx` | Conditionally hide directory nav button |

## Not changed

| Area | Reason |
|---|---|
| `src/views/admin/AdminDashboardView.tsx` | Admins always see the entry |
| `src/components/admin/singer-modal/SingerProfileForm.tsx` | Per-profile opt-out persists |
| `src/views/singer/ProfileView.tsx` | Per-profile opt-out persists |
| PocketBase hooks / rules | UI-only enforcement; no server gate |
| PocketBase migrations | Row created lazily on first save |

## Testing

- **`src/services/settings/directorySettings.test.ts`** — new. Unit test for
  `getDirectorySettings` fallback when setting is `null`, and
  `saveDirectorySettings` upsert payload.
- **`test/views/DirectoryView.test.tsx`** — update. Add tests for:
  - Singer accessing `/directory` when enabled → renders normally.
  - Singer accessing `/directory` when disabled → redirects to `/dashboard`.
  - Admin accessing `/directory` when disabled → still renders.
  - Singer dashboard button shown/hidden based on setting.
