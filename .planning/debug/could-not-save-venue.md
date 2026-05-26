---
status: resolved
trigger: "Could Not Save Venue"
created: 2026-05-26
updated: 2026-05-26
---

# Bug: Could Not Save Venue

## Symptoms
- **Expected:** The venue should save. not all venues have assigned seats. some are open seating
- **Actual:** Fails with PocketBase 400 error: `rowCounts: Cannot be blank`.
- **Reproduction:** I go to VenuesView, click 'Add Venue', fill in the name, select open seating, then select save
- **Timeline:** not sure
- **Log Evidence:**
  ```
  [PB 400] https://choir-manager.pockethost.io/api/collections/pbc_venues_001/records {
    "data": {
      "rowCounts": {
        "code": "validation_required",
        "message": "Cannot be blank."
      }
    },
    "message": "Failed to create record.",
    "status": 400
  }
  ```

## Current Focus
- **Hypothesis:** The frontend is not sending `rowCounts` (or sending it as null/empty) when "open seating" is selected, but the PocketBase collection `venues` (pbc_venues_001) has a "Non-empty" constraint or is required for that field.
- **Next Action:** Resolved.
- **Reasoning:** Identified `required: true` on `rowCounts` in PocketBase schema and relaxed it via migration.

## Evidence
- timestamp: 2026-05-26T10:00:00Z
  action: Read migration `1715690000_initial.js`
  finding: `rowCounts` field in `venues` collection has `"required": true`.
- timestamp: 2026-05-26T10:05:00Z
  action: Created migration `1717400000_make_row_counts_optional.js`
  finding: Applied fix to set `required: false` for `rowCounts`.

## Resolution
- **root_cause:** The `rowCounts` field in the `venues` collection was marked as `required: true`, which caused PocketBase to reject the empty array `[]` sent for "Open Seating" venues.
- **fix:** Created a new PocketBase migration `1717400000_make_row_counts_optional.js` to set `required: false` for the `rowCounts` field.
