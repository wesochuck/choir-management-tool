# Design System

This document defines the visual language and UI standards for the Choir Management Tool. Adhering to these tokens and patterns ensures consistency, maintainability, and accessibility across the application.

## 1. Design Tokens (CSS Variables)

All styles should use these tokens from `index.css` instead of hardcoded values.

### Colors
| Token | Value | Role |
| :--- | :--- | :--- |
| `--primary` | `#4a7c59` | Primary action color (Forest Green) |
| `--primary-light` | `#e9f0eb` | Background for primary light elements |
| `--primary-deep` | `#345940` | Deep green for text/borders on primary light |
| `--bg` | `#fcfcfc` | Main application background |
| `--surface` | `#ffffff` | Background for cards, modals, and inputs |
| `--text` | `#2c3e50` | Primary text color |
| `--text-muted` | `#64748b` | Muted text, labels, and secondary info |
| `--border` | `#e2e8f0` | Standard border color |

### Semantic Colors
| Token | Role |
| :--- | :--- |
| `--color-performance-bg` | Background for performance-related badges |
| `--color-performance-text` | Text color for performance-related badges |
| `--color-danger-bg` | Background for destructive/error actions |
| `--color-danger-text` | Text for destructive/error actions |
| `--color-success-bg` | Background for success/completed states |
| `--color-success-text` | Text for success/completed states |

### Spacing
Scale is based on 8px increments for visual rhythm.
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px

### Typography
- **Font Family**: Inter, system-ui, sans-serif.
- **Weights**: 400 (Body), 500 (Labels), 600 (Headlines), 700 (Display/Bold).
- **Scale**:
  - `font-size-display`: ~32px-48px (Main headers)
  - `font-size-headline`: 24px (Section headers)
  - `font-size-body`: 16px (Standard text)
  - `font-size-label`: 14px (Forms, secondary labels)
  - `font-size-sm`: 12px (Badges, fine print)

### Radii & Shadow
- **Radii**: 4px (`sm`), 8px (`md`), 12px (`lg`)
- **Shadows**: Use `--shadow-sm` for cards and `--shadow-md` for interactive elements/modals.

## 2. Component Scoped Styling

### Standards
1. **No Inline Styles**: All styles must be moved from TSX `style={{...}}` blocks into dedicated CSS files.
2. **Naming Convention**: Use kebab-case for classes. Class names should be descriptive (e.g., `.send-wizard-progress-bar` instead of `.progress`).
3. **File Location**: Component CSS must live in the same directory as the component (e.g., `src/views/admin/EventsView.css`).
4. **Layout**: Prefer Flexbox and Grid over floats or absolute positioning for main layouts.

## 3. Accessibility

- **Tap Targets**: All interactive elements (buttons, inputs, select) MUST have a minimum height of **44px**.
- **Contrast**: Text must meet WCAG AA standards against its background.
- **Focus States**: Never disable default focus outlines without providing a visible `--primary` themed alternative.

## 4. Maintenance Guidelines for Agents

- **Surgical Edits**: When refactoring, do not change unrelated layout logic.
- **TDD Requirement**: Before removing inline styles from a complex view, ensure Behavioral Integration Tests are passing to prevent regressions.
- **Token Usage**: If you find yourself using a hardcoded pixel value, check if a `--space-*` or `--font-size-*` token fits first.
