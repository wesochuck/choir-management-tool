# Phase 6: Music Library Management

## Objective
Introduce an admin-only music library to track repertoire, link pieces to set lists, manage sheet music inventory (copies, catalog IDs), allow CSV bulk imports, and provide historical performance reporting.

## Step 1: Database & Services
1. **Migration:** Create `pocketbase/pb_migrations/1715690030_music_library.js` for the `musicLibrary` collection.
   - Fields: `title` (text, required), `composer` (text), `copies` (number), `catalogId` (text), `historicalDates` (json array of dates/strings), `notes` (text).
   - Rules: Admin-only for all operations.
2. **Schema Update:** Update `src/services/eventService.ts` `SetListItem` interface to include an optional `pieceId?: string`.
3. **Service Layer:** Create `src/services/musicLibraryService.ts` for CRUD operations and handling bulk record creation (CSV import).

## Step 2: Admin Dashboard & CSV Import
1. **View:** Create `src/views/admin/MusicLibraryView.tsx`.
2. **Features:**
   - Datatable listing all pieces with search and sorting.
   - Standard create/edit/delete modal for individual pieces.
   - **CSV Import:** A button that accepts a CSV file (`Title`, `Composer`, `Copies`, `CatalogID`, `Historical Dates`), parses it, and creates records for every row (allowing duplicates).
   - **Duplicate Management:** A toggle to "Highlight Duplicates" (finds records with the exact same Title) and a bulk-delete feature (checkboxes) to easily clean up messy imports.
3. **Routing:** Add `/admin/library` to `App.tsx` and the `PageLayout` sidebar.

## Step 3: Set List Integration
1. **Component:** Update `src/components/admin/SortableSetListItem.tsx` and `SetListView.tsx`.
2. **Library Lookup:** When adding or editing an item in a set list, provide a combobox/searchable dropdown to optionally pick a piece from the `musicLibrary`.
3. **Behavior:** Selecting a piece auto-fills the `title` and `composer` inputs and attaches the `pieceId` to the `SetListItem`. Users can still type a custom string if they don't want to link it to the library.

## Step 4: Repertoire Reporting
1. **View:** Update `src/views/admin/ReportsView.tsx`.
2. **Report Addition:** Add a "Repertoire History" section.
3. **Logic:**
   - Fetch all `musicLibrary` pieces.
   - Fetch all `events` (Type: Performance).
   - For each piece, dynamically search for its `pieceId` across all performance `setLists`.
   - Merge the dynamic performance dates with the piece's manual `historicalDates` array.
   - Display a table showing each piece, its total performance count, and the most recent performance date.