# Summary: 05-02-Admin UI Refactor

## Execution Log
- Refactored `AuditionsView.tsx` to include the settings configuration inline (Enabled toggle, Default Performance selection, Available Slots, Confirmation Message) as well as a Performance filter.
- Updated `AuditionModal.tsx` to allow selecting and editing the associated Performance for an individual audition request.
- Removed outdated audition settings inputs from `SettingsView.tsx` so all settings are managed centrally in the Auditions dashboard.
- Verified TypeScript compilation.

## Verification
- `AuditionsView` now acts as the single source of truth for both audition settings and tracking individual requests.
- Settings are loaded from `settingsService` on mount and can be successfully toggled/saved directly from the UI.

## Output Artifacts
- `src/views/admin/AuditionsView.tsx`
- `src/components/admin/AuditionModal.tsx`
- `src/views/admin/SettingsView.tsx`