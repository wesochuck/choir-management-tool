---
status: resolved
trigger: "user has RSVP status Pending for an event, but send-to-all-pending reports no recipients"
created: "2026-05-22"
updated: "2026-05-22"
---

# Symptoms
- expected_behavior: "When sending a message to all pending users for an event, this singer should be included."
- actual_behavior: "Review & Send shows 0 recipients and blocks final send with 'No recipients selected'."
- error_messages: "'No recipients selected. You cannot send this message.'"
- timeline: "Observed after resetting this singer RSVP back to Pending."
- reproduction: "Open singer profile -> Performance RSVPs tab shows Pending for event -> create/send message targeting pending users for that event -> recipient summary is 0."

# Current Focus
- hypothesis: "Pending RSVP state in the singer editor is not the same source/shape used by messaging targeting query."
- test: "Trace recipient selection query and compare it against RSVP data model + status values used in singer editor."
- expecting: "Find mismatch in status token, event scope, archived filter, or relation field used for recipient query."
- next_action: "verify pending targeting includes implicit pending profiles when eventRosters record is absent"
- reasoning_checkpoint:
- tdd_checkpoint:

# Evidence
- timestamp: "2026-05-22"
  note: "rosterService.updateRSVP deletes eventRosters record when RSVP is reset to Pending and no attendance/folder/seat data exists."
- timestamp: "2026-05-22"
  note: "communicationService.resolveRecipients(eventId+rsvp) previously only considered existing eventRosters rows, so deleted rows were excluded from Pending targeting."
- timestamp: "2026-05-22"
  note: "Patch applied: for event + Pending filter, missing roster row is treated as implicit Pending."
- timestamp: "2026-05-22"
  note: "Validation: npm run lint, npm run build, npm test all passed."

# Eliminated

# Resolution
- root_cause: "Pending state in Singer modal can be represented by absence of eventRosters row, but messaging pending filter required an existing row."
- fix: "Updated recipient resolution to treat missing roster rows as Pending for event-scoped Pending targeting."
- verification: "Confirmed code path + full lint/build/test pass."
- files_changed: "src/services/communicationService.ts"
