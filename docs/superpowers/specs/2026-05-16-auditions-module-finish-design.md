# Auditions Module Finishing Design Spec

**Goal:** Complete the auditions module by fixing sorting bugs, expanding data collection, and bridging the gap between auditionees and choir members via an automated conversion flow.

## 1. Data Schema Updates

### Auditions Collection (`pbc_auditions_001`)
Add the following fields:
- `voicePart` (select): S1, S2, A1, A2, T1, T2, B1, B2 (Optional)
- `experience` (text): Musical background (Optional)
- `created` (autodate): System field (Required for sorting)
- `updated` (autodate): System field

### Infrastructure Fix
Ensure all collections created via `new Collection` in migrations include `created` and `updated` fields:
- `venues` (`pbc_venues_001`)
- `auditions` (`pbc_auditions_001`)
- `appSettings` (`pbc_settings_001`)

## 2. Admin Features (`AuditionsView.tsx`)

### New Audition Card Layout
- Display `voicePart` and `experience` fields.
- **Internal Notes:** A textarea that saves to the `notes` field. To keep it simple, it will save when the status is updated or via a dedicated "Save Notes" button (or on blur).
- **Convert to Singer:**
    - Button visible on each audition record.
    - Action:
        1. Open confirmation dialog.
        2. Create a `Profile` record using the auditionee's name, contact (as phone), and voice part.
        3. If `contact` looks like an email, also create a `UserAccount` with role `singer`.
        4. Set audition status to `Closed`.
        5. Refresh the list.

## 3. Public Features (`PublicAuditionView.tsx`)

### Form Expansion
- Add `Voice Part` dropdown.
- Add `Experience` textarea.
- Basic email validation for the `contact` field.

## 4. Technical Implementation

### Services (`auditionService.ts`)
- Update `Audition` interface.
- Add `convertAuditionToSinger(auditionId: string)` method.

### Migrations
- Create a new migration to add missing fields to existing collections.
- Update original migrations to prevent this issue in fresh installs (as per `GEMINI.md`).

## 5. Success Criteria
- [x] Admin can view the list of auditions without "Could not load" error.
- [x] Auditions are sorted by creation date (newest first).
- [x] Admin can add internal notes to an audition.
- [x] Admin can convert an auditionee into a singer profile with one click.
- [x] Public form successfully gathers voice part and experience.
