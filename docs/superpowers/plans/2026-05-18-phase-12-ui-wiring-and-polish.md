# Phase 12: UI Integration & Polish Implementation Plan

**Goal:** Wire up all recently completed backend utilities and service methods to their respective React views, completing the outstanding "In Progress" items in the project TODO list.

---

### Task 1: Roster & Music Library CSV Exports

**Files:**
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/views/admin/MusicLibraryView.tsx`

#### Roster View Wiring
- [ ] **Step 1: Implement "Export Roster" Button**
  - Add an "Export Roster" button in the action header next to the existing "Import Singers" button.
  - Apply the standard CSS premium buttons (e.g. styled via class `btn btn-secondary`).
- [ ] **Step 2: Trigger Download Logic**
  - On click, pass the current `singers` or `profiles` state list (or fetch a fresh list via `profileService.getProfiles()`) to the `exportToCSV` utility imported from `src/services/profileService`.
  - Create a temporary `<a href="data:text/csv;charset=utf-8,...">` element to trigger a native browser file download (file named `choir_roster_export.csv`).

#### Music Library View Wiring
- [ ] **Step 3: Implement "Export CSV" Button**
  - Add an "Export CSV" button in the library action panel.
- [ ] **Step 4: Trigger Download Logic**
  - On click, map the current loaded `pieces` state with `exportMusicToCSV` imported from `src/lib/musicPieceUtils`.
  - Trigger a browser download named `music_library_export.csv`.

---

### Task 2: Venue Delete Block & Prevention

**Files:**
- Modify: `src/views/admin/VenuesView.tsx`

- [ ] **Step 1: Check Venue Dependencies on Click**
  - In `handleDeleteVenue(id)` (or when the delete button is clicked), first invoke the `checkVenueDependencies(venueId)` utility imported from `src/services/venueService`.
- [ ] **Step 2: Clear UI Warnings & Block**
  - If `checkVenueDependencies` returns `true`, call `dialog.showMessage({ title: 'Delete Prevented', message: 'This venue is currently linked to scheduled events and cannot be deleted.', variant: 'danger' })` (or equivalent modal/dialog) and **abort** the delete action.
  - Otherwise, show the usual confirmation modal and proceed with `venueService.deleteVenue(id)`.

---

### Task 3: Music Library Duplicate Filtering UI

**Files:**
- Modify: `src/views/admin/MusicLibraryView.tsx`

- [ ] **Step 1: Add a Filter UI Element**
  - Add a toggle checkbox or button labeled `"Filter Duplicates"` (or `"Show Duplicates Only"`) in the search/filter action panel of the Music Library.
- [ ] **Step 2: Perform Duplicate Detection & Filter**
  - When the toggle is checked, apply the `findDuplicates` utility from `src/lib/musicPieceUtils` to the full list of music pieces, and update the visible filtered state list to display only the detected duplicate items.

---

### Task 4: Custom Voice Parts UI Editor

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

- [ ] **Step 1: Load and Render Custom Voice Parts**
  - Fetch dynamic voice parts using `getVoiceParts()` from `src/services/settingsService`.
  - Render an inline-editable grid/table showing both the voice part **label** (e.g. `T1`) and its **full name** (e.g. `Tenor 1`).
- [ ] **Step 2: Save Custom Voice Parts**
  - Provide fields to add, edit, or remove entries. Saving the voice parts updates the record in the `app_settings` / `appSettings` PocketBase collection.
- [ ] **Step 3: Update Dropdowns Across Views**
  - Dynamically load this voice part list in user registration/profile dropdowns, singer CSV imports, and seating charts rather than using a hardcoded array of `['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2']`.

---

### Task 5: Roster Avatar Display

**Files:**
- Modify: `src/views/admin/RosterView.tsx`

- [ ] **Step 1: Render Roster Photos**
  - In the singer management grid/table, add a column or grid element displaying the singer's photo.
  - Build the PocketBase file URL using `pb.files.getUrl(profile, profile.photo)` if a photo exists, fallback to a elegant CSS avatar placeholder if no photo is uploaded.
