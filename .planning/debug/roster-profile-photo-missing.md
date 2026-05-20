---
status: awaiting_human_verify
trigger: "Investigate this bug in /Users/wesosborn/Downloads/choir-management-tool: when adding a profile picture to someone in the roster, the UI appears to save successfully, but after saving and reopening the person/profile, the profile photo is missing. Please use scientific debugging: trace UI PhotoUploader -> admin roster/profile modal -> profileService/PocketBase update -> reload display. Look for root cause and propose or apply a minimal fix if obvious. Follow AGENTS.md TypeScript rules: no explicit any, use pb.files.getURL uppercase, pb.filter for dynamic filters. If you edit files, list changed paths. Return: root cause, evidence, fix, verification commands run or recommended."
created: 2026-05-20T17:36:29Z
updated: 2026-05-20T17:56:31Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

reasoning_checkpoint:
  hypothesis: "Normal profile saves were overwriting/removing the PocketBase file field because SingerModal included `photo` in ProfileInput and profileService passed it through as a plain JSON string after PhotoUploader uploaded the file separately."
  confirming_evidence:
    - "PhotoUploader writes the file through FormData at src/components/common/PhotoUploader.tsx:190-192."
    - "SingerModal copies the returned filename into formData at src/components/admin/SingerModal.tsx:455-459."
    - "HEAD only omitted `photo` when undefined, so a defined filename was included in the normal profile update payload."
  falsification_test: "If updateProfile omits `photo` for undefined, filename, and empty-string inputs, the regular save cannot touch the file field."
  fix_rationale: "The file field should only be changed by the dedicated FormData upload path; stripping `photo` from regular profile payloads prevents the later modal save from clearing/replacing it."
  blind_spots: "Production/PocketHost still needs confirmation that migration 1715690005_add_profile_photo.js is deployed and the profiles collection has a `photo` FileField."
next_action: "Ask user to verify the roster photo workflow in the real PocketHost environment after deploying/restarting with the profile photo migration applied."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: "Adding a profile picture to a roster person should persist the photo and show it when the person/profile is reopened."
actual: "The UI appears to save successfully, but after saving and reopening the person/profile, the profile photo is missing."
errors: "No error reported by user."
reproduction: "In roster UI, add a profile picture to a person, save, close/reopen the person/profile; the photo is missing."
started: "Unknown."

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-05-20T17:39:02Z
  checked: "Knowledge base and code search"
  found: "No knowledge-base match for photo/profile persistence. Relevant files found: src/components/common/PhotoUploader.tsx, src/components/admin/SingerModal.tsx, src/services/profileService.ts, src/hooks/useProfiles.ts, src/views/admin/RosterView.tsx, src/components/admin/RosterTable.tsx."
  implication: "Proceed with direct code-path tracing; likely categories from common patterns are Data Shape/API Contract or State Management."

- timestamp: 2026-05-20T17:50:15Z
  checked: "PhotoUploader -> SingerModal -> profileService update path"
  found: "PhotoUploader uploads via FormData with `fd.append('photo', file)` and calls `updateProfilePhoto(profileId, fd)`. SingerModal's onSuccess stores `updated.photo` into formData. RosterView then saves the whole formData through useProfiles.editProfile -> profileService.updateProfile."
  implication: "Photo upload and profile save are two separate writes; the second write can affect the file field if profileService includes `photo` in the regular JSON update payload."

- timestamp: 2026-05-20T17:50:15Z
  checked: "HEAD vs worktree diff for src/services/profileService.ts and test/profileService.test.ts"
  found: "HEAD only deleted `photo` when it was undefined, so a defined filename from SingerModal was passed to PocketBase as JSON. The current worktree already changes this to always `delete profile.photo`; the test now asserts regular updateProfile leaves the photo file field untouched."
  implication: "The suspected root cause has a focused fix already present in the worktree; proceed to verification."

- timestamp: 2026-05-20T17:56:31Z
  checked: "PocketBase schema/migration state"
  found: "An untracked migration pocketbase/pb_migrations/1715690005_add_profile_photo.js adds a `photo` FileField to the profiles collection. The checked local pocketbase/pb_data/data.db has not applied migrations 1715690004 or 1715690005, and its profiles collection fields do not include `photo`."
  implication: "Code fix is necessary but not sufficient in environments where the photo FileField migration has not run; deploy/restart/wake PocketHost and confirm the field exists."

- timestamp: 2026-05-20T17:56:31Z
  checked: "Verification commands"
  found: "`npm test` passed 92/92, `npm run build` passed, `npm run lint` passed, and `git diff --check` reported no whitespace errors."
  implication: "The current code/test state passes automated verification. Manual end-to-end roster upload verification remains needed against the actual PocketBase instance."

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: "Regular profile saves sent the PocketBase `photo` file field back as a plain filename string after PhotoUploader had already uploaded it via FormData. That made the later save able to clear or invalidate the file field, so the local preview looked successful but reload had no persisted photo."
fix: "Keep file-field writes isolated to updateProfilePhoto/FormData by always removing `photo` from splitProfileInput before create/update profile payloads. Ensure pocketbase/pb_migrations/1715690005_add_profile_photo.js is deployed/applied so the profiles collection actually has a `photo` FileField."
verification: "Automated: npm test, npm run build, npm run lint, git diff --check all passed. Manual: upload photo in roster, click Save Changes, close/reopen profile, confirm photo remains."
files_changed: ["src/services/profileService.ts", "test/profileService.test.ts", "test/migrations.test.ts", "pocketbase/pb_migrations/1715690005_add_profile_photo.js", ".planning/debug/roster-profile-photo-missing.md"]
