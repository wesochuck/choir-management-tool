---
phase: 05-security-audit-and-timing-attack-fix
reviewed: 2026-06-08T14:30:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - pocketbase/pb_migrations/1719700000_add_logo_to_app_settings.js
  - src/admin.css
  - src/components/common/PublicLogo.css
  - src/components/common/PublicLogo.tsx
  - src/services/settingsService.ts
  - src/views/PublicAuditionView.tsx
  - src/views/PublicDonationView.tsx
  - src/views/PublicTicketListView.tsx
  - src/views/PublicTicketPurchaseView.tsx
  - src/views/admin/SettingsView.tsx
  - src/views/singer/DashboardView.tsx
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 5: Code Review Report - Organization Logo Implementation

**Reviewed:** 2026-06-08
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

The organization logo feature is well-structured and follows the design specification. The database migration correctly uses the `pbc_settings_001` collection with the mandatory ID pattern, and the service layer properly handles file uploads to PocketBase using `FormData`. The presentational components are cleanly separated and the integration across public views is consistent.

However, there is one blocker regarding UI consistency (native dialog usage) and several warnings related to memory management and mobile responsiveness that should be addressed before shipping.

## Critical Issues

### CR-01: Prohibited Use of Native Browser Dialogs

**File:** `src/views/admin/SettingsView.tsx:236,246`
**Issue:** The `QueueWebhookSettings` component uses `window.confirm` and `alert` instead of the application's `useDialog()` hook. This violates the project's UI consistency mandate.
**Fix:**
```tsx
function QueueWebhookSettings() {
  const dialog = useDialog();
  // ...
  const handleGenerate = async () => {
    const confirmed = await dialog.confirm({
      title: 'Revoke Token?',
      message: 'Generating a new token revokes the old one. Update the PocketHost configuration immediately.',
      confirmLabel: 'Regenerate',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      const data = await queueSettingsService.generateToken();
      setToken(data.secret);
    } catch {
      await dialog.showMessage({ title: 'Error', message: 'Failed to generate token', variant: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };
```

## Warnings

### WR-01: Memory Leak via Unrevoked Object URLs

**File:** `src/views/admin/SettingsView.tsx:162`
**Issue:** `URL.createObjectURL(file)` is called whenever a new logo is selected for preview, but the generated URLs are never revoked. This can lead to memory leaks as the browser retains these blobs until the page is closed.
**Fix:**
Implement a cleanup strategy in `onChange` or via `useEffect`:
```tsx
// Inside SettingsView
useEffect(() => {
  return () => {
    if (logoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(logoUrl);
    }
  };
}, [logoUrl]);

// And in onChange:
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (logoUrl?.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    setLogoFile(file);
    setIsLogoRemoved(false);
    setLogoUrl(URL.createObjectURL(file));
  }
}}
```

### WR-02: Potential Layout Shift in Public Headers

**File:** `src/components/common/PublicLogo.tsx`
**Issue:** The `PublicLogo` component returns `null` while fetching the logo URL. When the URL is resolved, the logo and its container (with `margin-bottom: 2rem`) are rendered, causing a significant layout shift on all public pages.
**Fix:** Consider reserving height for the logo container or using a loading skeleton if a logo is expected to exist. Alternatively, render the container with a minimum height even before the URL is loaded if the fetch is fast.

### WR-03: Mobile UI Overflow Risk in Logo Actions

**File:** `src/admin.css:1222` (approx)
**Issue:** `.admin-settings-logo-actions` uses `.flex-row` which does not wrap by default. On small mobile devices, the "Replace Logo" and "Remove Logo" buttons may overflow the horizontal viewport.
**Fix:**
```css
.admin-settings-logo-actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
  flex-wrap: wrap; /* Ensure buttons stack on narrow screens */
}
```

## Info

### IN-01: Lack of Frontend File Validation

**File:** `src/views/admin/SettingsView.tsx:162`
**Issue:** While the backend migration enforces a 5MB limit, the frontend does not validate the file size before attempting the upload. This results in a generic "Failed to save" error message if a user selects a massive file.
**Fix:** Add a simple check in the `onChange` handler:
```tsx
if (file.size > 5 * 1024 * 1024) {
  dialog.showToast('File size must be under 5MB');
  return;
}
```

---

_Reviewed: 2026-06-08T14:30:00Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
