---
status: diagnosed
trigger: "Investigate duration field pollution in the choir-management-tool repo. User reports Edit Piece duration contains arbitrary text and suspects recent change adding time to pieces from audio file upload. Focus on data flow for piece duration: edit form inputs, audio upload metadata extraction, persistence/migrations/hooks. Do not modify files. Return likely root cause with file/line references and suggested fix."
created: 2026-05-20T20:36:36Z
updated: 2026-05-20T20:52:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: confirmed - duration pollution comes from unconstrained duration write paths, not from audio metadata extraction directly
test: completed code trace of edit form, audio upload suggestion, services, migrations, hooks, import, and set-list sync
expecting: diagnosis ready
next_action: report likely root cause with file/line references and suggested fix; no product files modified

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Edit Piece duration should contain a valid time duration, especially after audio upload metadata extraction.
actual: Edit Piece duration contains arbitrary text.
errors: none reported
reproduction: Open Edit Piece for affected music library record; duration input shows arbitrary text. Suspected after recent audio upload time addition.
started: recent change adding time to pieces from audio file upload suspected

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-05-20T20:36:36Z
  checked: knowledge base
  found: only prior entry was reportsview-not-defined; no duration/audio/piece overlap.
  implication: no known-pattern candidate from this repository knowledge base.

- timestamp: 2026-05-20T20:36:36Z
  checked: common bug patterns
  found: symptom is wrong data displayed/persisted; relevant patterns are Data Shape/API Contract and State Management/Dual Source of Truth.
  implication: prioritize tracing writers to the duration field and consumers that display or normalize it.

- timestamp: 2026-05-20T20:45:00Z
  checked: MusicLibraryView edit modal
  found: Edit Piece initializes duration directly from piece.duration, binds a plain text input to setDuration, and submits duration: duration || undefined without trimming or validation.
  implication: any persisted arbitrary string will be displayed exactly in the Edit Piece duration field and can be re-saved unchanged.

- timestamp: 2026-05-20T20:45:00Z
  checked: current HEAD commit f1fcd0a audio-duration change
  found: upload code creates Audio(), reads audio.duration on loadedmetadata, formats it with formatSecondsToDuration, and stores it only in suggestedDuration; it writes to duration only when the user clicks Apply.
  implication: the recent audio-duration feature is unlikely to directly pollute persisted duration with arbitrary text; it exposes/suggests duration but does not auto-save duration during upload.

- timestamp: 2026-05-20T20:45:00Z
  checked: service/schema/hooks
  found: musicLibraryService forwards raw partial data/FormData to PocketBase; initial migration defines musicLibrary.duration as text with empty pattern; audio migration only adds audioFiles and audioTrackMapping; hooks do not touch musicLibrary duration.
  implication: backend persistence accepts arbitrary duration text and has no normalization hook.

- timestamp: 2026-05-20T20:45:00Z
  checked: alternate duration writers
  found: CSV import maps any selected duration column value directly; SetListView syncs linked song duration changes directly back to Music Library.
  implication: arbitrary text can enter through manual Edit Piece input, CSV import/mapping, or linked set-list edits, then appears raw in Edit Piece.

- timestamp: 2026-05-20T20:52:00Z
  checked: working tree
  found: pre-existing uncommitted edits add isValidDurationString and validate MusicLibraryView/SetListView submit paths; these were not made by this investigation.
  implication: root cause is present in committed HEAD, while local working tree appears to contain a partial remediation that still leaves import/backend persistence unguarded.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: musicLibrary.duration is a free text field and committed write paths persist raw duration strings without validation/normalization. The recent audio upload feature only computes a formatted suggestedDuration and does not persist duration unless the user applies the suggestion, so it is a temporal suspect but not the direct pollution mechanism.
fix: centralize duration validation/normalization, apply it before all writes to musicLibrary.duration (Edit Piece, SetListView sync, movement creation, CSV import), and optionally add a PocketBase field pattern or before-save hook to reject invalid persisted values. Consider one cleanup script for existing polluted records.
verification: static trace only, per user request not to modify files. No runtime tests run.
files_changed: []
