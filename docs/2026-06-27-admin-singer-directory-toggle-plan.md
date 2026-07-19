# Admin Singer Directory Toggle — Implementation Plan

Reference spec: `docs/superpowers/specs/2026-06-27-admin-singer-directory-toggle-design.md`

## Overview

Add an admin-only `directorySettings` record in the `appSettings` collection that hides the singer directory from all users when disabled. Admins always see the link/route even when disabled.

## Tasks

### 1. Add `directorySettings` Service

**File: `src/services/settings/directorySettings.ts`** (new)

Exports:
- `DIRECTORY_SETTINGS_KEY = 'directorySettings'` — the key stored in `appSettings` collection
- `getDirectorySettings()` — reads `directorySettings` from `appSettings` collection, returns `{ enabled: boolean }` (defaulting `{ enabled: true }`)
- `saveDirectorySettings(value: { enabled: boolean })` — saves `{ enabled: value.enabled }` to `appSettings` with `isPublic: true`

### 2. Wire into `src/services/settingsService.ts`

Import and re-export `getDirectorySettings` and `saveDirectorySettings` from the barrel file so consumers import from `../../services/settingsService` (matching existing pattern).

### 3. Add Query Key in `src/lib/queryKeys.ts`

Add under the `appSettings` namespace:
```ts
appSettings: {
  // ...
  directory: ['appSettings', 'directorySettings'] as const,
}
```

### 4. Write Service Tests

**File: `src/services/settings/directorySettings.test.ts`**

Test cases:
- `getDirectorySettings` returns `{ enabled: true }` when setting is absent.
- `getDirectorySettings` returns stored value when present in `appSettings` collection.
- `saveDirectorySettings` updates/creates the setting in the `appSettings` collection with `isPublic: true`.

### 5. Add Toggle to `SettingsView`

**File: `src/views/admin/SettingsView.tsx`**

- Fetch `directorySettings` using `useQuery` and `queryKeys.appSettings.directory`.
- Add local state `directoryEnabled` (boolean) initialized from the query results.
- Add a new section card under "Choir Name" and "Organization Logo":
  - Label: `"Enable Singer Directory"`
  - Subtext: `"Allow singers to see the directory of all active members"`
- Integrate with the dirty-checking logic (`calculateSettingsDirty` or locally) so changing the toggle shows the `FloatingSaveBar`.
- Include the `saveDirectorySettings({ enabled: directoryEnabled })` invocation inside the `saveSettingsMutation` `Promise.all` save block.
- Invalidate `queryKeys.appSettings.directory` on save success.

### 6. Create Directory Route Guard

**File: `src/App.tsx`**

Create a `DirectoryRoute` (or `DirectoryGuard`) component:
- Reads `queryKeys.appSettings.directory`.
- Admins (`user.role === 'admin'`) bypass the check and render `<DirectoryView />`.
- Non-admins are redirected to `/dashboard` if `enabled === false`.
- Shows a loading spinner while state is resolved.

Wrap `/directory` route inside `App.tsx` with `DirectoryRoute`.

### 7. Conditionally Show Directory Button in Singer Dashboard

**File: `src/views/singer/DashboardView.tsx`**

- Fetch `directorySettings` query.
- Only render the "Singer Directory" button if `enabled !== false` or the current user is an admin.

### 8. Update Directory View & Guard Tests

**File: `test/views/DirectoryView.test.tsx`** (update)

Add tests verifying:
- Non-admin singers accessing `/directory` when enabled → renders directory list.
- Non-admin singers accessing `/directory` when disabled → redirects to `/dashboard`.
- Admin users accessing `/directory` when disabled → renders successfully.
- Singer dashboard button shown/hidden based on settings.

---

## Execution Order

1. Service layer (`directorySettings.ts`, `settingsService.ts`, `queryKeys.ts`)
2. Service tests
3. `SettingsView` UI updates
4. `DirectoryRoute` guard + `App.tsx` routing
5. `DashboardView` button visibility
6. Test suite run & verification

---

## Verification

- `rtk npx vitest run src/services/settings/directorySettings.test.ts`
- `rtk npx vitest run test/views/DirectoryView.test.tsx`
- `rtk node_modules/.bin/eslint --fix --no-warn-ignored --max-warnings 0`
- `rtk npm test`
