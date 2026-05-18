# Requirements - Choir Management Tool

## UI (User Interface)

- **UI-01: Visual Feedback**
  - Rows and list items must show a pointer cursor on hover.
  - Rows and list items must show a subtle background color change on hover (Sage Mist / #e9f0eb).
  - Hover effects must have smooth transitions.

- **UI-02: Row Actions**
  - Clicking a row in `RosterTable` must trigger the edit modal for that singer.
  - Clicking a row in `EventList` must trigger the edit modal for that event.
  - Clicking an `AppCard` in `CheckInList` must trigger the edit modal for that singer's profile.
  - Clicking an `AppCard` in `VenuesView` must trigger the edit form for that venue.
  - Clicking a row in `AuditionsView` must trigger the relevant action (e.g. status selection).

- **UI-03: Event Bubbling Prevention**
  - Clicks on buttons, links, or inputs inside a clickable row must NOT trigger the row-level click handler.
  - Clicks on labels for checkboxes/radios must work as expected without triggering the row action if they have their own behavior.

## Auditions Refactor (Phase 5)

- **AUDIT-01: Performance Association**
  - Audition requests must be associated with a specific performance event.
  - Schema must include a `performance` relation field on `auditions` collection.

- **AUDIT-02: Settings Integration**
  - Audition settings (enabled, slots, confirmation message) must be managed within `AuditionsView`.
  - Admin must be able to set a `defaultPerformance` for new audition requests.

- **AUDIT-03: Admin Management**
  - `AuditionsView` must allow filtering audition requests by performance.
  - The associated performance must be visible in the auditions list.

- **AUDIT-04: Public Submission**
  - `PublicAuditionView` must automatically assign the default performance to new requests.
  - If no default is set, the form should handle it gracefully (e.g., show an error or allow selection if multiple are active).
