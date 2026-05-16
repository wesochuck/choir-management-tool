---
phase: 03.2-rsvp-automation
reviewed: 2026-05-16T16:45:00Z
depth: deep
files_reviewed: 2
files_reviewed_list:
  - .planning/phase-3/PLAN.md
  - .planning/phase-3/SPEC.md
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 3: Code Review Report (RSVP & Status Automation - Cycle 3)

**Reviewed:** 2026-05-16
**Depth:** deep (Cross-file logic & security analysis)
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The revised design for Phase 3 (Cycle 3) successfully addresses all critical security vulnerabilities and logic gaps identified in previous reviews. The move to server-managed RSVP tokens and the inclusion of the choice in the HMAC payload eliminates the primary attack vectors. The status transition logic is now significantly more robust, incorporating attendance data and correctly handling manual overrides and new user "grace periods."

While the implementation is sound, two non-blocking logic refinements are recommended to prevent potential loopholes in the automated status management.

## Critical Issues

*No critical security or logic issues were found. The convergence of security requirements (server-side HMAC) and logic requirements (attendance integration) is confirmed.*

## Warnings

### WR-01: "Yes-but-Absent" Loophole in Inactive Logic

**File:** `.planning/phase-3/SPEC.md`
**Issue:** The definition of "Missed" used for the Inactive status transition currently requires the RSVP to be `No` or `Pending`. 
`Missed = (rsvp in [No, Pending]) AND (attendance in [Absent, Pending])`
This creates a loophole: a singer could RSVP "Yes" to every event (via the quick links) but never actually show up (Attendance = "Absent"). Because their RSVP is "Yes", they will never meet the "Missed" criteria and will remain "Active" indefinitely despite zero actual attendance.
**Fix:** 
Update the "Missed" definition to include cases where the singer RSVPed "Yes" but was still "Absent". 
```javascript
// Recommended "Missed" logic:
const missed = (attendance === 'Absent') || (attendance === 'Pending' && (rsvp === 'No' || rsvp === 'Pending'));
```
*Rationale: If they showed up (Present/Excused), they didn't miss. If they were Absent, they missed regardless of the RSVP. If attendance hasn't been taken yet (Pending), it's only a "miss" if they've already said No or haven't responded.*

### WR-02: Inconsistency in `isOpenForRSVP` vs. Token RSVPs

**File:** `.planning/phase-3/SPEC.md`
**Issue:** The `auto_status.pb.js` hook requires `isOpenForRSVP === true` for an upcoming "Yes" RSVP to grant "Active (Current)" status. However, the `quick-rsvp` API does not check this flag when processing a signed token. 
This means an admin could send RSVP tokens for a "closed" event; the singer clicks "Yes", the record is updated, but their status remains "Inactive" or "Active (Future)" because the automation engine ignores the "Yes" on the closed event.
**Fix:** 
Either remove the `isOpenForRSVP` check from the "Active (Current)" logic (trusting that if a "Yes" exists, it's valid engagement) OR ensure the `quick-rsvp` API rejects tokens for closed events. The former is recommended for better user experience.

## Info

### IN-01: Token Payload Information Disclosure

**File:** `.planning/phase-3/SPEC.md`
**Issue:** The token payload (`eventId|profileId|choice|expiresAt`) is signed but likely just Base64-encoded. This exposes internal IDs and choices to anyone who intercepts the email link.
**Fix:** 
While not a high risk in this context, consider using URL-safe Base64 and ensure no sensitive PII is ever added to the payload. The current IDs are acceptable but should be noted.

### IN-02: Status Change Reason Granularity

**File:** `.planning/phase-3/SPEC.md`
**Issue:** The `statusChangeReason` is a great addition for transparency. 
**Suggestion:** Ensure the implementation includes the specific event titles in the reason for Inactive transitions (e.g., "Inactive: Missed last 3 performances: Spring Concert, Gala, and Community Fest") to reduce admin support requests.

---

_Reviewed: 2026-05-16_
_Reviewer: gsd-code-reviewer_
_Depth: deep_
