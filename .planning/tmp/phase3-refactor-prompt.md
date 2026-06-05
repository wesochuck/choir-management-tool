You are tasked with executing Phase 3 of our CSS Refactoring Plan.

## Goal
Eliminate `style={{ ... }}` inline styles from the following Phase 3 Admin Configuration files:
1. `src/components/admin/StatusAutomationSettings.tsx`
2. `src/components/admin/VoicePartEditor.tsx`
3. `src/components/admin/SeasonManagementSettings.tsx`
4. `src/components/admin/RosterSettingsTab.tsx`
5. `src/components/admin/RosterDisplayOptionsSettings.tsx`
6. `src/components/admin/SectionBucketEditor.tsx`
7. `src/components/admin/RosterSummary.tsx`
8. `src/views/admin/SettingsView.tsx`

## Steps
1. Review the inline styles present in the above files. Common patterns include settings groups (`flex-col` with gap), nested settings groups (left border and padding), input fields with specific width/height, checkboxes, description paragraphs with zero margin, and flex-rows for checkbox labels.
2. Define a set of unified CSS classes for these patterns in `src/admin.css` (e.g., `.admin-settings-group`, `.admin-settings-nested-group`, `.admin-settings-field`, `.admin-settings-input-sm`, `.admin-checkbox-label`, `.admin-checkbox-input`, `.admin-checkbox-description`, `.admin-divider`, `.admin-settings-hint`).
3. Replace all inline `style={{ ... }}` blocks in the 8 target files with your new standard classes. (If there's an absolute position/calc/dynamic value, you may keep it but add `// @allow-inline-style` above it, though Phase 3 files typically shouldn't need this).
4. **CRITICAL**: Remove these 8 files from the `legacyInlineStyleWhitelist` in `test/codebaseIntegrity.test.ts`. 
5. Run `npm test` to verify your changes did not break the `codebase integrity: enforce no inline styles rule`.
6. DO NOT commit the changes. Just leave the files modified.

Respond when you are finished.