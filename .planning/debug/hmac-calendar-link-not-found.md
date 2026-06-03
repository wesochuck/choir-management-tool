---
status: investigating
trigger: "i'm struggling with i think hmac stuff that is manifesting itself in singers not being able to get their calendar link but i think could be depper."
created: 2026-06-03
updated: 2026-06-03
symptoms:
  expected: "In singer dashboard they can get a calendar feed link."
  actual: "Currently they get an error \"Failed to load calendar link. {\\\"error\\\":\\\"Singer profile not found\\\"}\"."
  errors: "Failed to load calendar link. {\"error\":\"Singer profile not found\"}"
  timeline: "Since the HMAC refactor."
  reproduction: "Try to load the \"My Profile\" part of a singer profile and scroll down."
---

# Current Focus

- **hypothesis**: The HMAC token validation is failing or the profile lookup logic in the calendar hook is using an incorrect identifier (e.g., user ID instead of profile ID or vice versa) following the HMAC refactor.
- **test**: Inspect the calendar hook/service and the HMAC validation logic to see how profiles are being resolved.
- **expecting**: To find a mismatch between the identifier passed in the URL/token and the identifier expected by the PocketBase query.
- **next_action**: Gather initial evidence by locating the calendar link generation and the corresponding backend handler.

# Evidence

# Eliminated
