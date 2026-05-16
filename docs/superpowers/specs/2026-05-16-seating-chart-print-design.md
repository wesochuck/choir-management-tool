# Design Spec: Seating Chart Text-Only Print Mode

**Date:** 2026-05-16
**Status:** Approved (Brainstorming Phase)

## Overview
Adds a "Text-only" print mode to the Seating Chart creator. This mode provides a clean, decoration-free list of singers by row, using only their last names, suitable for quick reference during rehearsals or performances.

## Goals
- Allow admins to toggle between a visual grid print and a text-only list print.
- Format the text list as comma-separated last names per row.
- Provide clear indicators for "Front" and "Back" rows.
- Ensure the output is high-contrast (black text on white background) and free of UI decoration.

## Architecture

### 1. UI Changes (`SeatingView.tsx`)
- Add a toggle or segmented control in the action bar (near the Print button).
- State: `printMode: 'visual' | 'text'`.
- This state will apply a class (e.g., `print-mode-text`) to the main seating container.

### 2. Component Logic (`SeatingGrid.tsx`)
- **Visual Mode (Existing):** Remains unchanged but is hidden via CSS when `print-mode-text` is active.
- **Text Mode (New):** A new section rendered at the same level as the grid.
  - Iterates through `rowCounts` and `assignments`.
  - Extracts last names: `profile.name.split(' ').pop()`.
  - Filters out empty seats or represents them as `(Empty)` if requested (default: skip).
  - **Row Indicators:**
    - Row 1: Labeled "Row 1 (Back)" (assuming standard choir orientation where Row 1 is furthest from director).
    - Last Row: Labeled "Row N (Front)".
    - *Note:* Direction will be confirmed/configurable if existing layout logic differs.

### 3. Styling (`App.css` / Inline)
- `.text-print-layout`: Hidden by default (`display: none`).
- `.print-mode-text .text-print-layout`: Visible (`display: block`).
- `.print-mode-text .grid-print`: Hidden (`display: none`).
- **Print Media Queries:**
  - Ensure `.text-print-layout` uses a clean serif or sans-serif font, size 12pt.
  - Remove all shadows, badges, and background colors.

## Success Criteria
1. Admin can toggle "Text Mode" and see a list of last names.
2. Clicking "Print" while in Text Mode results in a clean text document.
3. The first and last rows are explicitly labeled "Back" and "Front".
4. Names are comma-separated and correctly associated with their rows.
