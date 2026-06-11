# VenuesView: Convert inline form to BaseModal

## Goal

Replace the currently inline `AppCard`-wrapped form with a `BaseModal`, reusing the app's standard modal pattern (as seen in TicketingView, EventRosterView).

## Changes

### 1. Add import

```tsx
import { BaseModal } from '../../components/common/BaseModal';
```

### 2. Replace inline form card (lines ~103–157) with BaseModal

Remove this entire block:

```tsx
{isAdding && (
  <AppCard title={editingId ? 'Edit Venue' : 'Create New Venue'}>
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      ...
    </form>
  </AppCard>
)}
```

Replace with:

```tsx
<BaseModal
  isOpen={isAdding}
  onClose={resetForm}
  title={editingId ? 'Edit Venue' : 'Create New Venue'}
  maxWidth="500px"
  footer={
    <div className="flex flex-row gap-4">
      <Button variant="ghost" onClick={resetForm}>Cancel</Button>
      <Button type="submit" form="venue-form" variant="primary">Save Template</Button>
    </div>
  }
>
  <form id="venue-form" onSubmit={handleSave} className="flex flex-col gap-4">
    {/* same form fields, no changes to inputs/labels/validation */}
  </form>
</BaseModal>
```

The form content (name Input, address Input, open seating checkbox, row capacities Input, layout) stays identical — only the wrapper changes from `AppCard` to `BaseModal`.

### 3. Header "+ New Venue" button

The condition `{!isAdding && (...)}` guarding the button in the page header should be removed. Since the form is now a modal, the button should always be visible:

```tsx
// Before:
{!isAdding && (
  <div className="flex-shrink-0 mt-1">
    <Button onClick={() => setIsAdding(true)} variant="primary">+ New Venue</Button>
  </div>
)}

// After:
<div className="flex-shrink-0 mt-1">
  <Button onClick={() => setIsAdding(true)} variant="primary">+ New Venue</Button>
</div>
```

### 4. No other state changes

- `isAdding`, `editingId`, `name`, `address`, `isOpenSeating`, `rowCountsStr`, `resetForm`, `handleSave`, `handleEdit` all stay the same.
- `resetForm()` is called by the modal's `onClose` and by the Cancel button — same as today.
- Empty state card (line ~228–241) stays unchanged.

## Verification

- "Loading" spinner page (line 79–83) remains unchanged.
- "No Venue Templates" empty state (line 228–241) remains unchanged.
- The venue card grid (lines 159–225) remains unchanged.
- TypeScript check must pass, lint must pass.
