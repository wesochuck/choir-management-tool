# Task 5: Modular Roster Management (Admin) Design Spec

## Goal
Build a global roster view for administrators to manage choir singers, following a modular architecture with API services, custom hooks, and separated UI components.

## UI Design (Soft Mode)
- **Background:** `#f0f4f8` (Subtle gray-blue) for the main view.
- **Components:** White cards with subtle shadows (`box-shadow: 0 4px 6px rgba(0,0,0,0.05)`).
- **Typography:** High contrast for readability, bold labels for voice parts.
- **Accessibility:** Large tap targets, clear labels above dropdowns, semantic colors for statuses.

## Data Model Updates
The `profiles` collection `globalStatus` field will be updated to support:
- `Active (Current)`: Singer is singing in the upcoming performance.
- `Active (Future)`: Singer is active but not in the current performance cycle.
- `Inactive`: Singer is not planning to sing again soon.

## Architectural Components

### 1. API Service (`src/services/profileService.ts`)
Isolated PocketBase interactions:
- `getProfiles()`: Fetches all records from the `profiles` collection, expanded with `user` data.
- `createProfile(data)`: Creates a new singer profile.
- `updateProfile(id, data)`: Updates existing singer profile.
- `deleteProfile(id)`: Deletes a singer profile.

### 2. Custom Hook (`src/hooks/useProfiles.ts`)
State management and coordination:
- **State:**
  - `profiles`: Array of profile records.
  - `isLoading`: Boolean loading state.
  - `error`: Error message if any.
  - `filters`: `{ voicePart: string, status: string }`.
- **Computed State:**
  - `filteredProfiles`: Profiles filtered by the current `filters`.
- **Actions:**
  - `addProfile(data)`
  - `editProfile(id, data)`
  - `removeProfile(id)`
  - `setFilter(key, value)`

### 3. Dumb Components (`src/components/admin/`)
- **`RosterTable.tsx`**: Renders the list of singers.
  - Props: `profiles: Profile[]`, `onEdit: (p: Profile) => void`.
- **`SingerModal.tsx`**: Form for adding/editing a singer.
  - Props: `isOpen: boolean`, `onClose: () => void`, `onSave: (data: any) => void`, `initialData?: Profile`.

### 4. Smart View (`src/views/admin/RosterView.tsx`)
- Orchestrates the page layout.
- Uses `useProfiles` hook for data and filtering.
- Manages `SingerModal` state (open/closed, current profile being edited).

## Routing
- Route: `/admin/roster`
- Guarded by admin role check in `App.tsx`.
