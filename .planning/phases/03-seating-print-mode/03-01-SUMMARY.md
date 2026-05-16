# Summary: Phase 3 - Seating Chart Text-Only Print Mode

## Overview
Implemented a robust, high-performance Seating Chart Print Mode that provides both visual and text-only reference sheets for directors.

## Changes
- **Utilities:** Created `src/lib/stringUtils.ts` with `getLastName` supporting common suffixes (Jr, Sr, etc.).
- **SeatingView:**
  - Added `printMode` toggle between 'Visual Grid' and 'Text List'.
  - Optimized rendering by pre-grouping assignments into rows using `useMemo`.
  - Implemented `SeatingTextList` component with physically accurate row labeling (Row 1 = Back).
- **Styles:** Updated `src/App.css` with scoped `@media print` rules to isolate print output based on the selected mode.

## Verification
- [x] Toggle UI switches between modes.
- [x] Text list shows correctly parsed last names.
- [x] Print preview isolates the selected mode (no overlap).
- [x] Performance is stable with full roster assignments.
