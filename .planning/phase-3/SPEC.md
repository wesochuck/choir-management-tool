# Specification: Phase 3 - RSVP & Status Automation (Cycle 3)

## Goal
Implement secure automatic status transitions for profiles based on RSVP and attendance history, and enable "no-login" RSVP functionality via signed tokenized email links. This revision moves all cryptographic operations to the server and fixes logic bugs found in the previous design.

## Data Schema Changes

### `profiles` Collection (`pbc_3414089001`)
- **Field:** `doNotEmail` (bool, default: `false`) - User opt-out for automated communications.
- **Field:** `statusIsManual` (bool, default: `false`) - If true, automation will never change this singer's status.
- **Field:** `statusLastChangedAt` (date) - Audit timestamp for the last automation event.
- **Field:** `statusChangeReason` (text) - Explanation of the most recent automation decision (e.g., "Missed last 3 performances", "RSVPed Yes to upcoming event").

### `events` Collection (`pbc_1687431684`)
- **Field:** `isOpenForRSVP` (bool, default: `false`) - Admin control for RSVP visibility. If false, "Active (Current)" logic ignores this event.

## Automatic Status Logic (Server-Side Hook)

Implemented as a PocketBase `onModelAfterUpdate` / `onModelAfterCreate` hook on the `eventRosters` collection.

### Transition Rules (Precedence Order):

1.  **Manual Override:**
    - If `profile.statusIsManual === true`, exit logic immediately. No changes made.

2.  **Active (Current) - Highest Priority:**
    - **Condition:** Singer has at least one "Yes" RSVP for an *upcoming* event (`date >= now`) where `type === 'Performance'` AND `isOpenForRSVP === true`.
    - **Rationale:** If they are planning to show up soon, they are current.

3.  **Inactive:**
    - **Condition 1:** The system has at least 3 past performances (`type === 'Performance'`, `date < now`) where `event.date > profile.created`.
    - **Condition 2:** The singer "missed" the 3 most recent past performances.
    - **Definition of "Missed":**
        - (`rsvp` is "No" or "Pending") AND (`attendance` is "Absent" or "Pending").
        - *Essentially: They didn't say yes and didn't show up, OR they said no and (obviously) didn't show up.*
    - **Rationale:** Consistent lack of engagement.

4.  **Active (Future) - Fallback:**
    - **Condition:** Does not meet "Active (Current)" or "Inactive" criteria.
    - **Rationale:** Default state for engaged singers between performances.

### Logic Implementation (`pb_hooks/auto_status.pb.js`):
- Optimization: Only update the `profiles` record if the calculated status OR reason differs from the current values (prevents infinite hook loops and redundant writes).
- Use `app.dao().runInTransaction` to ensure atomicity.

## Secure Quick RSVP (Server-Side Managed)

### Server-Side Token Service (`pb_hooks/token_service.pb.js`)
- **Endpoint:** `POST /api/generate-rsvp-tokens` (Admin only).
- **Request:** `{ eventId: string, profileIds: string[] }`.
- **Logic:**
    - Verify `HMAC_SECRET` exists in `appSettings`. Throw error if missing (no default).
    - For each `profileId`:
        - Generate payload: `eventId|profileId|choice|expiresAt`.
        - Choice is "Yes" or "No".
        - `expiresAt` = `max(now + 30 days, eventDate + 1 day)`.
        - Sign using HMAC-SHA256.
    - **Response:** `{ tokens: { [profileId]: { yes: string, no: string } } }`.

### Server-Side RSVP Processor (`pb_hooks/quick_rsvp.pb.js`)
- **Endpoint:** `POST /api/quick-rsvp` (Public).
- **Request:** `{ token: string }`.
- **Logic:**
    - Verify HMAC signature.
    - Check `expiresAt`.
    - Update/Create `eventRosters` record for the `profileId` and `eventId`.
    - This trigger will automatically fire the `auto_status.pb.js` hook.
- **Response:** `{ success: true, choice, eventTitle }`.

## UI Requirements

### Roster Management
- **RosterTable:** Show "No Email" icon for `doNotEmail` = true.
- **SingerModal:** Toggles for `doNotEmail` and `statusIsManual`. Display "Last Changed" and "Reason".

### Event Management
- **EventModal:** Toggle for `isOpenForRSVP`.

### Communication
- **Message Composer:** `communicationService` calls `/api/generate-rsvp-tokens` to populate the `{{RSVP_LINKS}}` placeholder with signed buttons/links.

### Public RSVP View
- **Route:** `/rsvp?t=...`
- Simple landing page: "Processing RSVP..." -> API call -> "Thank you! You are marked as [Yes/No] for [Event Name]".

## Security (STRIDE)

| Threat | Category | Mitigation |
|--------|----------|------------|
| Spoofing | S | HMAC-SHA256 signatures generated and verified only on server. |
| Tampering | T | `choice` and `expiresAt` are immutable parts of the signed payload. |
| Info Disclosure | I | Tokens are opaque base64; minimal internal IDs exposed in payload (acceptable). |
| Elevation | E | RSVP updates via custom route use restricted DAO context; `statusIsManual` prevents automation tampering. |
