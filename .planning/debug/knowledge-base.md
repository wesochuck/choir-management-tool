# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## reportsview-not-defined — ReferenceError: ReportsView is not defined in App.tsx
- **Date:** 2024-05-24
- **Error patterns:** ReferenceError, ReportsView, not defined, App.tsx
- **Root cause:** ReportsView component was added to App.tsx routes but the import statement was missing.
- **Fix:** Add import ReportsView from './views/admin/ReportsView' to App.tsx.
- **Files changed:** src/App.tsx
---
