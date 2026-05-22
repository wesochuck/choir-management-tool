# Settings Architecture: Decentralized Feature Configuration & Server-Side User Preferences

This document details the architectural patterns for managing settings and configurations in the Choir Management Tool. It serves as developer/agent guidelines for all future settings additions or modifications.

---

## The Philosophy of Settings Decentralization

Settings are split into two categories to prevent the "monolithic configuration bloat" anti-pattern:

1. **System Configuration (Admin Settings)**:
   - Reserved strictly for infrastructure-level, organization-wide properties.
   - Examples: `choirName`, SMTP server configuration, Twilio integration.
   - Location: `src/views/admin/SettingsView.tsx`

2. **Feature Configuration (Product Views)**:
   - Configured directly inside their respective product views.
   - Managed under specialized `Settings` / `Config` tabs within those views.
   - Examples: 
     - **Roster Settings** (Voice Parts, Season, Section Buckets & Colors) inside `RosterView.tsx`.
     - **Music Catalog Settings** (Genres, Catalog URL Lookup) inside `MusicLibraryView.tsx`.
     - **Formations Templates** (Seating formations strategy and Section ordering) inside `SeatingView.tsx`.

---

## Server-Side User Preferences (Personal View State)

User preferences (sorting selections, view states, personal filters) must **never** clutter the administrative system settings database. Instead, they are stored directly on the individual `users` collection record inside a flexible JSON field named `preferences`.

### Centralized Management & UI Cleanliness

To maintain a clean, premium, and clutter-free user interface:
1. **No On-Page Verbose Banners**: Feature views (like Roster, Attendance, and Event RSVP lists) must **not** display verbose alert banners or "User Preference" indicators explaining that a sort order is saved locally/personally. Keep these lists clean and focused on action.
2. **Central Profile Hub (`ProfileView.tsx`)**: All personal view configurations must be exposed and configured in a single, dedicated **"View Preferences"** section within the user's Profile View. This allows both singer and admin accounts to modify and review all device-spanning view behaviors in one unified hub.

### Schema & Merge Engine

- **Database Column**: `preferences` (JSON column in `users` collection).
- **TypeScript Interface**: Exposes typed user preferences inside `src/types/auth.ts`.
- **Merge Engine**: `src/lib/userPreferences.ts` implements a type-safe merge strategy that merges partial user preferences with existing ones, preserving existing configurations while writing updates.
- **Provider Hook**: `useAuth()` exposes `updatePreferences(partialPreferences)` to save values safely and asynchronously to the remote PocketBase server database.

### Usage in Product Views

Sorting preferences (e.g., sorting the Singer Directory, Attendance grids, Event RSVPs) must load user-specific preferences with appropriate local defaults. Direct modifications of sorting dropdowns on the views also trigger immediate, seamless persistence to the server database.

Example code pattern for personal view preferences:
```typescript
import { useAuth } from '../../contexts/AuthContext';

export default function MyView() {
  const { user, updatePreferences } = useAuth();
  
  // 1. Resolve sorting from preferences with local fallback
  const sortBy = user?.preferences?.myFeatureSort || 'lastName';
  
  // 2. Wire update directly to database preferences update
  const handleSortChange = (newSort: 'lastName' | 'voicePart') => {
    updatePreferences({ myFeatureSort: newSort });
  };
}
```

---

## Guidelines for Adding Future Settings

### 1. Personal User View Preferences
If adding user-specific sorting, display modes (e.g., default list vs cards), or toggle states:
- **Do not** add a new collection field.
- **Do** append the property to the `UserPreferences` type definition inside `src/types/auth.ts`.
- **Do** wire the selector/input control directly to `updatePreferences({ newPreference: value })`.
- **Do** implement a sensible fallback default (e.g. `'lastName'`) if `user?.preferences?.newPreference` is undefined.

### 2. Feature Configuration (Non-Global)
If adding a setting that configures how a specific feature works or defines templates/presets for that feature:
- **Do not** add configuration controls to the global `SettingsView.tsx`.
- **Do** add a settings tab or sub-panel directly inside that feature's main view (e.g., `MyFeatureView.tsx`).
- **Do** load the feature's configuration into a local independent state (e.g., loaded on mount or tab activation) to avoid blocking navigation.
- **Do** implement a draft system utilizing a `FloatingSaveBar` component with clean save/discard user flows.
- **Do** validate user configuration and use `dialog.confirm()` or `dialog.showMessage()` to inform the user of updates.

### 3. System Administration
If adding system-level integrations (new email gateway, SMS provider, global auth providers, security defaults):
- **Do** add controls to the central global `SettingsView.tsx`.
- **Do** store settings key-value entries in the `appSettings` collection.
- **Do** maintain a strict schema-first policy by adding corresponding PocketBase JS migrations under `pocketbase/pb_migrations/`.

---

## UI Consistency & Aesthetics Checklist

When developing or modifying configuration inputs:
- Ensure all saving/discarding operations use the standard `FloatingSaveBar` positioned at the bottom of the page.
- Color pickers must utilize beautiful square or circular elements instead of ovals (e.g., standard layout with `borderRadius: '6px'`).
- Always use professional alerts, high contrast background colors, and micro-animations to align with the core premium design system.
