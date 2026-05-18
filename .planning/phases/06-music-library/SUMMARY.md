# Summary: 06-Music Library

## Execution Log
- Created `musicLibrary` PocketBase collection migration.
- Built `musicLibraryService.ts` to handle CRUD operations and bulk creation/deletion.
- Created `MusicLibraryView.tsx` Admin Dashboard that features a table, modal editing, CSV importing, and duplicate highlighting logic.
- Integrated the Music Library into Set Lists by allowing users to select a piece from a dropdown in `SetListView.tsx`, which attaches the `pieceId` to the `SetListItem`.
- Updated `ReportsView.tsx` to include a Repertoire History report that merges the manually input `historicalDates` with dynamic performance dates pulled from active set lists.
- Verified TypeScript compilation successfully.

## Output Artifacts
- `pocketbase/pb_migrations/1715690030_music_library.js`
- `src/services/musicLibraryService.ts`
- `src/views/admin/MusicLibraryView.tsx`
- `src/views/admin/SetListView.tsx`
- `src/views/admin/ReportsView.tsx`
- `src/App.tsx` and `src/views/admin/AdminDashboardView.tsx`