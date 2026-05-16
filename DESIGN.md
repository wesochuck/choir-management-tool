---
name: Choir Management Tool
description: A fresh, calm, and efficient management tool for non-profit choirs.
colors:
  primary: "#4a7c59"
  primary-light: "#e9f0eb"
  primary-deep: "#345940"
  neutral-bg: "#fcfcfc"
  neutral-surface: "#ffffff"
  neutral-text: "#2c3e50"
  neutral-muted: "#64748b"
  neutral-border: "#e2e8f0"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: The Modern Rehearsal

## 1. Overview

**Creative North Star: "The Modern Rehearsal"**

The Modern Rehearsal is built on the principles of clarity, calm, and efficiency. It rejects the over-saturated and cluttered interfaces of legacy management software in favor of a clean, breathable space that feels as organized as a well-run rehearsal. The system uses a "Restrained" color strategy, where soft sage greens provide a calming anchor against a backdrop of clean, off-white neutrals.

**Key Characteristics:**
- **Breathable Density:** Generous whitespace (negative space) to reduce cognitive load for users of all technical levels.
- **Organic Precision:** Softly rounded corners (8px–12px) that feel approachable but professional.
- **Calm Clarity:** A palette dominated by clean whites and sage greens, avoiding high-vibration "all black" themes or neon accents.

## 2. Colors

The palette is anchored in nature-inspired greens and soft, stable neutrals.

### Primary
- **Sage Green** (#4a7c59): The primary brand anchor. Used for main actions, active navigation states, and success indicators. It is calm yet authoritative.
- **Sage Mist** (#e9f0eb): A light tint used for secondary backgrounds, hover states, and subtle grouping.

### Neutral
- **Clean Off-White** (#fcfcfc): The main application background. Soft enough to avoid screen glare but bright enough to feel fresh.
- **Pure White** (#ffffff): Used for card surfaces and elevated containers to create depth through tonal layering.
- **Charcoal Slate** (#2c3e50): The primary text color. High legibility without the harshness of pure black.

### Named Rules
**The Sage 10% Rule.** The primary Sage Green is used sparingly (≤10% of any screen) to ensure it remains an effective indicator of action and importance.

## 3. Typography

The system uses a single, high-performance Sans-Serif stack for a modern, efficient feel.

**Body & Display Font:** Inter (with system-ui fallbacks)

### Hierarchy
- **Display** (700, clamp 2rem-3rem): Used for main page titles and hero statements.
- **Headline** (600, 1.5rem): Used for section headers and card titles.
- **Body** (400, 1rem, 1.5 line-height): The workhorse for all lists, forms, and descriptions. Max line length: 70ch.
- **Label** (500, 0.875rem): Used for buttons, tags, and helper text.

## 4. Elevation

Depth is conveyed primarily through tonal layering (white cards on off-white backgrounds) rather than heavy drop shadows.

### Shadow Vocabulary
- **Surface Shadow** (`box-shadow: 0 1px 3px rgba(0,0,0,0.05)`): A barely-there shadow used to define card boundaries on the main background.
- **Action Shadow** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1)`): Appears only on hover for interactive elements like buttons and clickable cards.

## 5. Components

### Buttons
- **The Standard Button Rule.** All interactive buttons must have a minimum height of 44px and consistent horizontal padding (16px–24px) to ensure accessibility and professional rhythm.
- **Shape:** Medium rounded (8px radius / 0.5rem).
- **Primary:** Sage Green (#4a7c59) background with Pure White text. Used for the single most important action on a screen.
- **Secondary:** Sage Mist (#e9f0eb) background with Sage Green text. Used for alternative or less critical actions.
- **Ghost:** Transparent background with Charcoal Slate text. Subtle borders allowed. Used for navigation, "Cancel", or secondary tertiary actions.
- **Danger:** Soft Red Mist (#fee2e2) background with Deep Red (#991b1b) text. Used for destructive actions (Delete, Reset). Never use high-vibration neon reds.
- **Hover State:** All buttons must slightly shift tone or elevation (Action Shadow) on hover to provide clear tactile feedback.

### Cards
- **Style:** Pure white background with 12px rounded corners and a subtle border (#e2e8f0).
- **Internal Padding:** Large (24px) to ensure content doesn't feel cramped.

### Navigation
- **Style:** Clean, vertical or horizontal bars with Sage Green indicators for the active route. Typography uses the Label style for clarity.

## 6. Do's and Don'ts

### Do:
- **Do** use Sage Mist (#e9f0eb) for large background areas or secondary cards.
- **Do** ensure all tap targets (buttons, links) are at least 44px tall.
- **Do** use Charcoal Slate (#2c3e50) for all body text to maintain soft, high legibility.

### Don't:
- **Don't** use pure black (#000) for text or backgrounds.
- **Don't** use neon or high-vibration colors for accents; stick to the sage and neutral palette.
- **Don't** use aggressive, dark-mode-only styles with glassmorphism or heavy glows.
