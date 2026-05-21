# Design Spec: Seasonal Dues Tracking

## Overview
Implement a lightweight seasonal dues tracking system for the choir management tool, allowing admins to track payment status (Paid/Unpaid) for each singer on a per-season basis.

## Data Architecture
### New Collection: `seasonalDues`
- `profile`: Relation to `profiles`
- `season`: String (e.g., "2026-2027")
- `paid`: Boolean (Default: false)

### Existing Collection: `settings`
- Add/Utilize `currentSeason`: String (e.g., "2026-2027")

## Implementation Details
1.  **Dues Service (`src/services/duesService.ts`)**:
    - `getDuesForSeason(season: string)`: Fetch all dues records for a season.
    - `updateDues(profileId: string, season: string, paid: boolean)`: Upsert logic for payment status.
2.  **Settings Service Update**:
    - Ensure `settingsService` supports reading/writing the `currentSeason`.
3.  **UI Components**:
    - **Settings Page**: Add a card for "Season Management" to update `currentSeason`.
    - **Roster Admin Page**: Add a "Dues Paid" column. 
      - The column will display a checkbox that toggles the `paid` status for the `currentSeason` retrieved from global settings.

## Logic Flow
- Admin updates "Current Season" in Settings.
- Roster view fetches `currentSeason` from Settings.
- Roster view fetches all `seasonalDues` for that season.
- Roster view renders checkbox for each singer:
    - Checked if `seasonalDues` entry exists and `paid === true`.
    - Unchecked otherwise.
- Toggling the checkbox calls `duesService.updateDues` for the current season.

## Testing Strategy
- Verify creating a new season automatically populates UI.
- Verify toggling paid status persists correctly in PocketBase.
- Verify filtered roster view reflects only the active season.
