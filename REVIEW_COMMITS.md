---
phase: review-commits
reviewed: 2024-05-26T10:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/views/admin/music-library/MusicLibraryTable.tsx
  - src/views/admin/MusicLibraryView.tsx
  - src/views/admin/EventRosterView.tsx
  - src/App.tsx
  - src/views/admin/AdminDashboardView.tsx
  - pocketbase/pb_hooks_src/generate-main-pb-js.ts
  - pocketbase/pb_hooks/main.pb.js
  - pocketbase/pb_hooks_src/email/queueProcessor.ts
  - src/views/admin/AuditionsView.tsx
  - src/components/admin/BulkEventModal.tsx
  - src/components/admin/MusicImportModal.tsx
  - src/components/admin/RosterImportModal.tsx
  - pocketbase/pb_migrations/1717400000_make_row_counts_optional.js
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase Review: Code Review Report

**Reviewed:** 2024-05-26
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The submitted code introduces significant improvements to the Music Library (pagination, movements, duplicate detection), Roster Management (bulk updates, CSV export), and the Email Queue system. 

Key strengths include:
- Strict adherence to PocketBase Goja VM "Safe Patterns" for JSON byte decoding and asset URL generation.
- Robust timezone handling using `Intl` with custom fallbacks for the backend environment.
- Efficient use of React hooks and context for state management.

The primary concern is a **Critical XSS vulnerability** in the backend markdown rendering logic which could allow malicious users to inject JavaScript into emails sent to choir members and administrators.

## Critical Issues

### CR-01: XSS Vulnerability in Backend Markdown Link Rendering

**File:** `pocketbase/pb_hooks/main.pb.js:37` (also in `pocketbase/pb_hooks_src/email/emailRendering.ts`)
**Issue:** The `renderMarkdown` function uses a regular expression to convert markdown links `[text](url)` to HTML `<a>` tags without sanitizing the URL. A malicious user could craft a message (e.g., via an audition request or by an admin in a communication draft) containing `[click me](javascript:alert(document.cookie))`. This will be rendered as a functional JavaScript link in the recipient's email client (if supported) or webmail interface. Additionally, the URL is not escaped, allowing attribute injection if it contains quotes.

**Fix:**
Implement a protocol whitelist (e.g., `http:`, `https:`, `mailto:`, `tel:`) and escape the URL attribute.

```javascript
// pocketbase/pb_hooks_src/email/emailRendering.ts

// Inside renderMarkdown...
html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
    const sanitizedUrl = url.trim();
    // Only allow safe protocols
    if (!/^(https?|mailto|tel):/i.test(sanitizedUrl)) {
        return text; // Return plain text if unsafe
    }
    // Escape quotes in URL for attribute safety
    const safeUrl = sanitizedUrl.replace(/"/g, '&quot;');
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${text}</a>`;
});
```

## Warnings

### WR-01: CSV Formula Injection (CSV Excel Injection)

**File:** `src/views/admin/EventRosterView.tsx:327`
**Issue:** The `q(str)` helper and CSV construction logic do not account for CSV Formula Injection. If a singer's name or other exported field starts with characters like `=`, `+`, `-`, or `@`, spreadsheet applications like Excel or Google Sheets may execute the content as a formula when the CSV is opened.

**Fix:**
Sanitize exported strings by prefixing them with a single quote if they start with sensitive characters.

```typescript
const q = (str: string) => {
  let val = str.replace(/"/g, '""');
  if (val.match(/^[=\+\-@]/)) {
    val = "'" + val; // Add single quote to neutralize formula
  }
  return `"${val}"`;
};
```

### WR-02: Pagination "Select All" Scope Inconsistency

**File:** `src/views/admin/MusicLibraryView.tsx:319`
**Issue:** The `onSelectAll` handler in `MusicLibraryView` only selects/deselects the items on the **current page** (`paginatedPieces`). In administrative interfaces, users typically expect the "Select All" checkbox in the header to select **all items matching the current filters** across all pages. This inconsistency can lead to data loss or incorrect bulk operations if a user thinks they have selected the entire library but only deleted the first 25 items.

**Fix:**
Change the `onSelectAll` scope to `filteredPieces`.

```typescript
onSelectAll={(checked) => {
  const newSet = new Set(selectedIds);
  if (checked) {
      // Select all filtered items across all pages
      filteredPieces.forEach(p => newSet.add(p.id));
  } else {
      // Deselect all filtered items (or just the current page depending on desired UX)
      filteredPieces.forEach(p => newSet.delete(p.id));
  }
  setSelectedIds(newSet);
}}
```

## Info

### IN-01: Hardcoded Organization Placeholders

**File:** `pocketbase/pb_hooks/main.pb.js` (approx line 200)
**Issue:** The email queue processor uses a hardcoded default mailing address ("123 Choir St, Harmony City"). While these are fallbacks, they should ideally be flagged in the UI if not configured, rather than sending "dummy" data to users.

**Fix:** Consider using more generic placeholders or forcing configuration of organization details before allowing bulk email dispatch.

---

_Reviewed: 2024-05-26_
_Reviewer: gsd-code-reviewer_
_Depth: standard_
