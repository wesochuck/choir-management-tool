# Event & Venue Link with Quick-Add Integration Plan

We will add a database relation linking events to venues, support creating new venues inline directly from the scheduling modal, and automatically select the matching venue layout when creating seating charts.

---

## Proposed Changes

### 1. Database & Migrations Layer

#### [NEW] [1715690014_event_venue_relation.js](file:///Users/wesosborn/Downloads/choir-management-tool/pocketbase/pb_migrations/1715690014_event_venue_relation.js)
- Write a migration to add a nullable relation field `venue` (maxSelect: 1, pointing to `'pbc_venues_001'`) to the `'events'` collection (`pbc_1687431684`).

---

### 2. Services & Hooks Layer

#### [MODIFY] [eventService.ts](file:///Users/wesosborn/Downloads/choir-management-tool/src/services/eventService.ts)
- Extend `Event` interface with optional `venue?: string` property and corresponding expanded fields.
- Update `getEvents()` query to expand both `'parentPerformanceId'` and `'venue'`.
- Modify `bulkCreateRehearsals()` to copy the parent performance's `venue` relation to weekly rehearsals automatically.

#### [MODIFY] [useVenues.ts](file:///Users/wesosborn/Downloads/choir-management-tool/src/hooks/useVenues.ts)
- Modify `addVenue` function to return the created `Venue` record so the caller can select its ID instantly.

---

### 3. Component & Modal Layer

#### [MODIFY] [EventModal.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/components/admin/EventModal.tsx)
- Accept `venues: Venue[]` and `onAddVenue: (venue: Partial<Venue>) => Promise<Venue>` in props.
- Render a **Venue Template** select dropdown loaded with existing venues and a dynamic "+ Add New Venue..." option.
- If "+ Add New Venue..." is clicked, display a soft, inline form inside the modal requesting a name and row capacities. Saving this form invokes `onAddVenue`, saves the venue, selects it automatically, and resumes scheduling.
- Auto-fill the static `location` field with the selected venue's name, but leave it editable as a "Location Description" for minor modifications (e.g. "Main Sanctuary - Choir Loft").

---

### 4. Admin Views Layer

#### [MODIFY] [EventsView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/EventsView.tsx)
- Load active venues by calling `useVenues()` hook.
- Pass the loaded `venues` and `addVenue` function down to `<EventModal />`.

#### [MODIFY] [SeatingView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/SeatingView.tsx)
- Add a `useEffect` hook that listens to the `performanceId` state. If a selected performance has a linked `venue` ID, automatically set the view's active `venueId` to that venue template!

---

### 5. UI Layout Display Overrides (Compatibility & Live Updates)
Ensure that all views automatically render the live, up-to-date venue name if an event is linked to one:
- [MODIFY] `src/components/admin/EventList.tsx`
- [MODIFY] `src/views/admin/AttendanceView.tsx`
- [MODIFY] `src/components/singer/EventCard.tsx`
- [MODIFY] `src/views/singer/SeatingFinderView.tsx`
- [MODIFY] `src/views/admin/CommunicationView.tsx`

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to verify all TS types and imports.

### Manual / System Verification
1. **Apply Migration:** Shut down and restart pocketbase to run the new schema migration.
2. **Add Event with Inline Venue:**
   - Go to **Event Management** -> click **+ Single Event**.
   - In the **Venue** dropdown, select **+ Add New Venue...**.
   - Fill in `"Grace Cathedral"` with capacities `"10, 12, 14"` and click **Add Venue**.
   - Verify that the new venue is created, selected in the dropdown, and that the event is scheduled successfully.
3. **Automatic Seating Chart Select:**
   - Navigate to **Seating Charts**.
   - Select the newly created performance.
   - Verify that the **Venue Layout** dropdown automatically selects `"Grace Cathedral"` on load!
