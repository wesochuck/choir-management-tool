# Specification: Audition Module Refactor

## Objective
Refactor the auditions module to tie requests to specific performance events and move administrative settings to the primary auditions management view.

## Proposed Changes

### 1. Database Schema
Update the `auditions` collection (`pbc_auditions_001`) to include a relationship to the `events` collection.

- **Field Name**: `performance`
- **Type**: `relation`
- **Collection**: `events` (`pbc_1687431684`)
- **Required**: `false` (to support legacy requests, but ideally required for new ones)
- **Max Select**: `1`

### 2. Audition Settings Expansion
Update `AuditionSettings` interface and `DEFAULT_AUDITION_SETTINGS` to support a default performance association.

- **File**: `src/services/settingsService.ts`
- **New Field**: `defaultPerformanceId?: string`

### 3. Services Update

#### `auditionService.ts`
- Update `Audition` interface to include `performance?: string`.
- Update `createAudition` to accept `performance`.
- Update `getAuditions` to potentially expand the `performance` relation.

#### `settingsService.ts`
- Ensure `getAuditionSettings` and `saveAuditionSettings` handle the new `defaultPerformanceId` field.

### 4. UI Refactor (Admin)

#### `AuditionsView.tsx`
- Integrate settings UI (enabled toggle, available slots, confirmation message, default performance).
- Add a filter for "Performance" to the auditions list.
- Display the associated performance for each audition request.
- Ensure settings are saved correctly from this view.

#### `SettingsView.tsx`
- Remove the "Auditions" section.
- Redirect or link to `AuditionsView` if necessary, though direct removal is preferred as the menu already links to both.

### 5. UI Refactor (Public)

#### `PublicAuditionView.tsx`
- Fetch the `defaultPerformanceId` from settings.
- If multiple performances are available/intended for auditions, potentially allow selection (based on user's "at the agent's discretion").
- *Decision*: For now, we will use the `defaultPerformanceId` from settings, and if not set, fallback to a "To be determined" state if allowed by schema, or prompt user to select from upcoming performances.

## Trust Boundaries & Security
- Public create rule for `auditions` remains open.
- Admin rules for `auditions` and `appSettings` remain restricted.
- The `performance` relation must be validated on the server or handled gracefully if the ID is invalid.

## Data Migration
- A migration script will add the `performance` field.
- Existing auditions will have a `null` performance.
