# Public Chorus Landing Page Design

## Overview

Build a public-facing chorus landing page that replaces the current auth-gated root route (`/`) and adds a separate `/history` page. The landing page will serve as the default homepage for visitors, with clear calls-to-action to buy tickets, audition, donate, log in, and read the chorus history. All content should be editable by admins through the existing settings UI, using EasyMDE for rich-text fields.

## Goals

1. Provide a polished public homepage at `/` with:
   - Hero image
   - Hero headline and subtitle
   - About-us section
   - Ticket, audition, donation, and history links
   - Past performances section auto-pulled from completed events
   - Login link
   - Contact section
2. Add a separate `/history` page with editable rich text.
3. Keep all content editable through settings.
4. Reuse existing public page patterns and services.
5. Avoid hardcoding public-facing copy in the app code.

## Scope

### In scope
- New public landing view at `/`
- New public history view at `/history`
- New settings fields for hero image, headline, subtitle, about-us text, history text, contact info, and link section
- Admin UI updates in Settings to edit those fields with EasyMDE
- Auto-pulled past performances from events
- Public route wiring and navigation
- Tests and verification

### Out of scope
- A full CMS or section builder
- Custom drag-and-drop layout editing
- New authentication changes beyond exposing the root route
- New PocketBase schema migrations unless required for settings persistence

## Architecture

### Route changes
- Replace the current root route (`/`) with a public landing view.
- Add a new `/history` route.
- Keep the existing public routes (`/tickets`, `/auditions`, etc.) unchanged.

### Settings model
Use the existing `appSettings` key/value pattern with new keys:
- `hero_image` — file upload, same retrieval pattern as `logo`
- `hero_headline`
- `hero_subtitle`
- `landing_about`
- `history_content`
- `contact_info`
- `public_links`

### Components
- `PublicLandingView` — main landing page
- `PublicHistoryView` — history page
- `HeroSection` — renders hero image + headline + subtitle
- `PublicContactSection` — renders contact info
- `PastPerformancesSection` — auto-pulls completed events and displays them
- `PublicLinkCards` — renders ticket, audition, donation, history, and login links

### Admin UI
- Extend the Settings page with EasyMDE fields for rich text and simple text inputs for link/contact data.
- Reuse the existing settings service pattern for saving and loading values.

## User Experience

### Landing page
- Hero section with image and headline
- CTA buttons: Buy Tickets, Auditions, Donate, History, Login
- About-us section
- Past performances section
- Contact section

### History page
- Rich text editor in admin settings
- Public page renders the saved markdown

## Data Flow

1. Admin edits settings in the Settings page.
2. Settings service saves key/value pairs to PocketBase.
3. Public views load settings on mount.
4. Hero image is fetched via `pb.files.getURL(...)` like the existing logo.
5. Past performances are fetched from public event endpoints filtered to completed events.

## Error Handling

- If hero image is missing, show a fallback gradient/placeholder.
- If settings fail to load, show empty/default copy gracefully.
- If no past events exist, show an empty state with no crash.

## Testing

- Unit test route behavior and settings service helpers.
- Component tests for the new public views.
- Verify the root route is public and the history route renders correctly.

## Implementation Order

1. Add settings service helpers for the new keys.
2. Add settings UI fields with EasyMDE.
3. Add public landing and history views.
4. Add supporting components.
5. Update routes.
6. Add tests.
7. Run lint, tests, and build.

## Risks

- Hero image upload handling may need a new file field on the existing `appSettings` record.
- If the current settings UI does not have a generic editor pattern, the settings page may need a small reusable editor component.
- The landing page must remain fast even when pulling past events.
