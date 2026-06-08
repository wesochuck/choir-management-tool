# Design Spec: Organization Logo Upload and Display

**Date:** 2026-06-08
**Status:** Approved
**Topic:** Adding the ability to upload an organization logo in admin settings and displaying it on public pages.

## 1. Overview
The goal is to allow administrators to brand the public-facing pages of the choir management tool with a logo. This involves a new upload interface in the System Settings and integration of the logo into the headers of auditions, ticketing, donations, and singer profile pages.

## 2. Database Changes
We will modify the existing `appSettings` collection (`pbc_settings_001`).

### Migration
- Add a new field `logo` to the `appSettings` collection.
- **Field Type:** `file`
- **Max Files:** 1
- **Allowed Extensions:** `png, jpg, jpeg, svg, webp`
- **Mime Types:** `image/png, image/jpeg, image/svg+xml, image/webp`
- **Max Size:** 5MB (default safe limit)

### Data Management
- A specific record in `appSettings` with the `key: 'logo'` will be used to store the logo file.
- This record must have `isPublic: true` to allow unauthenticated access to the file URL.

## 3. Service Layer Updates (`src/services/settingsService.ts`)
- **`getLogoUrl()`**: 
    - Fetches the `appSettings` record where `key = 'logo'`.
    - Returns the full URL using `pb.files.getURL(record, record.logo)`.
    - Returns `null` if no logo is set or record doesn't exist.
- **`saveLogo(file: File | null)`**:
    - If `file` is provided: 
        - Upserts the `logo` record using `FormData`.
        - Sets `key: 'logo'` and `isPublic: true`.
    - If `file` is `null`:
        - Updates the `logo` record to clear the `logo` field (or deletes the record/field).

## 4. Admin Interface (`src/views/admin/SettingsView.tsx`)
- Add a new `AppCard` titled "Organization Logo" below the "Choir Name" section.
- **Controls:**
    - **Image Preview:** A box showing the current logo (if any).
    - **Upload Button:** Standard file input styled as a button.
    - **Remove Button:** Visible only if a logo exists.
- **Integration:**
    - Logo changes will be tracked in the local state of `SettingsView`.
    - The `isDirty` calculation will be updated to include the logo (comparing the new `File` or `null` against the initial state).
    - Saving via the `FloatingSaveBar` will trigger `settingsService.saveLogo`.

## 5. Public Display (`src/components/common/PublicLogo.tsx`)
A new presentational component will be created.

### Component Logic
- Fetches the logo URL on mount.
- Renders nothing if no logo is found.
- Renders an `<img>` tag wrapped in a centered container if found.

### Styling (CSS)
- **Positioning:** Centered at the very top of the public forms, above the main `AppCard` or at the top of the card content depending on the view.
- **Dimensions:**
    - `max-height: 100px` (desktop)
    - `max-height: 80px` (mobile)
    - `max-width: 90%` (responsive containment)
- **Scaling:** `object-fit: contain` to preserve aspect ratio.
- **Spacing:** `margin-bottom: 2rem` to separate branding from form content.

## 6. Integration Points
The `PublicLogo` component will be added to the top of:
- `src/views/PublicAuditionView.tsx`
- `src/views/PublicTicketListView.tsx`
- `src/views/PublicTicketPurchaseView.tsx`
- `src/views/PublicDonationView.tsx`
- `src/views/singer/DashboardView.tsx`

## 7. Success Criteria
1. Admin can upload a PNG/JPG/SVG/WebP logo in System Settings.
2. Admin can preview the logo before saving.
3. Admin can remove the logo.
4. The logo appears centered and correctly sized on all specified public pages.
5. If no logo is uploaded, pages render as they do currently with no layout shifts or broken image icons.
6. The logo resizes appropriately on mobile devices.
