# Phase 3: Seating Chart Text-Only Print Mode

## Overview
Adds a "Text-only" print mode to the Seating Chart creator. This mode provides a clean, decoration-free list of singers by row, using only their last names, suitable for quick reference during rehearsals or performances.

## Requirements
- **PRNT-01: Mode Toggle**
  - Admin can switch between "Visual" and "Text-only" layout modes in the Seating View.
- **PRNT-02: Text List Formatting**
  - Text-only mode shows a list of rows.
  - Each row contains comma-separated last names of assigned singers.
  - Rows are labeled with "Back" (Row 1) and "Front" (Last Row) indicators.
- **PRNT-03: Print Optimization**
  - Navigation, sidebars, and buttons are hidden during print.
  - The text list is high-contrast black on white.

## Design
- **Toggle:** State-driven class on a shared container.
- **Logic:** Map `assignments` to `activeProfiles` and extract last names.
- **CSS:** Use `@media print` to isolate the text layout and hide the visual grid.
