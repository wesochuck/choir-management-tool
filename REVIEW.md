---
phase: code-review
reviewed: 2026-05-26T03:11:31Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/views/admin/EventRosterView.tsx
  - pocketbase/pb_hooks/main.pb.js
  - src/App.tsx
  - src/views/admin/AdminDashboardView.tsx
  - src/views/admin/MusicLibraryView.tsx
  - src/views/admin/music-library/MusicLibraryFilters.tsx
  - src/views/admin/music-library/MusicLibraryTable.tsx
  - src/views/admin/RsvpDashboardView.tsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase Code Review: Code Review Report

**Reviewed:** 2026-05-26T03:11:31Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The review evaluated 8 files covering the Admin Dashboard, Music Library, RSVP systems, and backend PocketBase hooks. The implementation contains a critical logic flaw in the library table's bulk selection state that destroys user selections across paginated boundaries, and a critical string replacement vulnerability in the backend generated code that risks corrupting dynamically generated emails. Additionally, several warnings were identified involving unhandled promise rejections that could leave the application stuck in loading states.

## Critical Issues

### CR-01: Regex Replacement Vulnerability in Email Templating

**File:** `pocketbase/pb_hooks/main.pb.js:1153-1188`
**Issue:** `String.prototype.replace(regex, dynamicString)` is highly vulnerable to substitution token injection. If a dynamic string like `eventTitle`, `recipientName`, or `eventDetails` contains a dollar sign followed by a capture group number or `$&` (e.g., `"Singing in the $& Rain"`), JavaScript's `replace` engine interprets it as a special token, replacing it with regex captures or the matched substring. This corrupts outgoing email contents and subject lines.
**Fix:** Pass a replacer function instead of a raw string to ensure literal replacement. This fix must be applied to all dynamic string replacements (`eventTitle`, `eventType`, `eventDate`, `eventLocation`, `eventDetails`, `eventInfoHtml`, and `recipientName`).

```javascript
// Change this:
subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));

// To this:
subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));
```

### CR-02: "Select All" Pagination Bug Erases Selections

**File:** `src/views/admin/music-library/MusicLibraryTable.tsx:205` & `src/views/admin/MusicLibraryView.tsx:327`
**Issue:** The `onSelectAll` handler assumes the "Select All" toggle should entirely overwrite the `selectedIds` state with only the items on the current page (`paginatedPieces`). This wipes out any selections users have made on other pages. Additionally, the checkbox UI state evaluates `selectedIds.size === filteredPieces.length`, which is broken because `selectedIds` spans all pages while `filteredPieces` evaluates just the current page's length. This leads to the checkbox checking/unchecking itself incorrectly.
**Fix:** 

In `MusicLibraryTable.tsx`:
```tsx
<input 
    type="checkbox" 
    checked={filteredPieces.length > 0 && filteredPieces.every(p => selectedIds.has(p.id))}
    onChange={(e) => onSelectAll(e.target.checked)}
/>
```

In `MusicLibraryView.tsx`:
```tsx
onSelectAll={(checked) => {
  const newSet = new Set(selectedIds);
  if (checked) {
      paginatedPieces.forEach(p => newSet.add(p.id));
  } else {
      paginatedPieces.forEach(p => newSet.delete(p.id));
  }
  setSelectedIds(newSet);
}}
```

## Warnings

### WR-01: Missing Loading State Reset on Error

**File:** `src/views/admin/EventRosterView.tsx:161-172`
**Issue:** In the `.catch` block for initial data loading (`Promise.all`), `setIsLoading(false)` is not called. If the view is being rendered inline (`isInline` is true), the component does not navigate away, leaving the user permanently stuck viewing the "Loading RSVP details..." screen.
**Fix:** Ensure `setIsLoading(false)` is invoked when an error occurs before triggering the dialog modal.

```typescript
.catch((err) => {
  console.error('Failed to load roster data', err);
  if (isCurrent) {
    setIsLoading(false); // Fix added here
    dialog.showMessage({ ...
```

### WR-02: Unhandled Promise Rejections on Roster Profile Edits

**File:** `src/views/admin/EventRosterView.tsx:257-261` and `269-277`
**Issue:** Several async operations lack `.catch` handlers or `try/catch` blocks. `handlePhotoChange` invokes `.then()` on a promise but misses `.catch()`. `handleSingerModalSave` and `handleSingerModalDelete` await API operations but don't use `try/catch`. This will result in an unhandled promise rejection that fails silently and potentially leaves modals open without notifying the user of the error.
**Fix:** Wrap the modal save/delete operations in `try/catch` blocks and chain `.catch()` to the dangling promise.

```typescript
const handleSingerModalSave = async (formData: ProfileInput) => {
  if (!selectedSingerProfile) return;
  try {
    await profileService.updateProfile(selectedSingerProfile.id, formData);
    await refreshProfiles();
    if (eventId) {
      const rosters = await rosterService.getEventRoster(eventId);
      setEventRoster(rosters);
    }
  } catch (err) {
    console.error('Failed to save singer profile', err);
  }
};

const handlePhotoChange = () => {
  if (eventId) {
    rosterService.getEventRoster(eventId).then(setEventRoster).catch(console.error);
  }
};
```

### WR-03: Missing React Error Boundary for Suspense

**File:** `src/App.tsx:50`
**Issue:** The application uses `React.lazy` and `Suspense` for routing, but does not wrap the router or suspense block in an Error Boundary. If a network error occurs during a chunk load, the application will completely crash and present a blank white screen instead of a graceful error fallback.
**Fix:** Add a standard `ErrorBoundary` wrapper component around the `Suspense` block or `Routes`.

## Info

### IN-01: Empty Catch Block Silences Real Errors

**File:** `pocketbase/pb_hooks/main.pb.js:1966`
**Issue:** An empty `catch (e) {}` block inside the `post_event_report` cron job completely swallows potential errors when finding the appSettings record. While default values are used as fallbacks, silently swallowing the error makes diagnosing DB access or parsing issues impossible.
**Fix:** Log the error defensively: `catch (e) { console.log("Warning: Failed to parse communications settings", e); }`

### IN-02: Auth Store Cleared Without Redirect

**File:** `src/views/admin/AdminDashboardView.tsx:8`
**Issue:** The logout handler directly calls `pb.authStore.clear()`. While the `useAuth` hook might listen to auth store changes globally, directly clearing the store without triggering an explicit navigation (`navigate('/login')`) or context `logout()` function can lead to inconsistent UI states or require a manual refresh on some React architectures.
**Fix:** Expose and use `logout()` from `useAuth` context or call `navigate('/login')` explicitly after clearing the authStore.

---

_Reviewed: 2026-05-26T03:11:31Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_