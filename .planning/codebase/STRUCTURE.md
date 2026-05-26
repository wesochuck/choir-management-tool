# Codebase Structure

**Analysis Date:** 2026-05-26

## Directory Layout

```
choir-management-tool/
├── .agents/          # Agent-specific skill rules and instructions
├── docs/             # ADRs and overarching design documentation
├── pocketbase/       # Backend logic and migrations
│   ├── pb_hooks/     # Backend event scripts and endpoints
│   └── pb_migrations/# Sequential schema definitions
├── src/              # Frontend UI code
│   ├── assets/       # Static assets (images, raw SVGs)
│   ├── components/   # Presentational React components
│   ├── contexts/     # React Context providers (Auth, UI global state)
│   ├── hooks/        # State coordination logic and feature hooks
│   ├── lib/          # Pure helper utilities
│   ├── services/     # API request abstractions
│   ├── types/        # TypeScript interfaces and schema types
│   └── views/        # Page-level route views
└── test/             # Codebase and feature tests (Vitest/Jest)
```

## Directory Purposes

**`src/components/`:**
- Purpose: Presentational building blocks.
- Contains: `admin/`, `common/`, `player/`, `singer/` component subfolders.
- Key files: `src/components/common/PageLayout.tsx` (standardizing views).

**`src/services/`:**
- Purpose: Execution of PocketBase interactions.
- Contains: Database service instances logic.
- Key files: `src/services/profileService.ts`, `src/services/eventService.ts`, `src/services/settingsService.ts`.

**`src/hooks/`:**
- Purpose: Encapsulation of complex React states wrapping the services.
- Contains: Feature-specific state managers.
- Key files: `src/hooks/useAttendance.ts`, `src/hooks/useEvents.ts`, `src/hooks/useSeatingChart.ts`.

**`pocketbase/pb_migrations/`:**
- Purpose: Maintain strict sequence database schema.
- Contains: `*_{name}.js` schema setup files.
- Key files: Must never hold utility `.ts` files, only execution scripts.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: DOM hookup and global React providers.
- `src/App.tsx`: App-level routing definition.
- `pocketbase/pb_hooks/main.pb.js`: Backend initialization endpoint hook script.

**Configuration:**
- `vite.config.ts`: React framework Vite configuration.
- `tsconfig.json`: TypeScript checks.
- `GEMINI.md`: Project constraints and strict architectural conventions.

**Core Logic:**
- `src/lib/pocketbase.ts`: Core frontend SDK initialization and global interceptors.
- `src/services/`: Core logic abstractions separated by domain (Event, Venue, Roster).

**Testing:**
- `test/`: Integration and isolated tests (e.g. `test/eventService.test.ts`, `test/calendar.test.ts`).

## Naming Conventions

**Files:**
- PascalCase for React components and views: `PageLayout.tsx`, `AdminDashboardView.tsx`
- camelCase for services, hooks, utilities: `eventService.ts`, `useEvents.ts`

**Directories:**
- camelCase, grouped by feature or layer. Top-level src/ directories correspond to separation-of-concerns layers.

## Where to Add New Code

**New Feature:**
- Primary code: Create feature view in `src/views/`.
- Tests: Add test logic in `test/` (e.g. `test/myFeature.test.ts`).

**New Component/Module:**
- Implementation: Base components go to `src/components/{feature}/`. If interacting with DB, place service logic inside `src/services/` and consume via a newly created hook in `src/hooks/`.

**Utilities:**
- Shared helpers: Pure utility functions belong in `src/lib/` (e.g. `src/lib/calendar.ts`). Avoid putting UI or data dependencies here.

## Special Directories

**`pocketbase/pb_hooks_src/`:**
- Purpose: TypeScript/JS sources for generating the inline Goja backend hooks inside `pocketbase/pb_hooks/main.pb.js`.
- Generated: No
- Committed: Yes

**`pocketbase/pb_data/`:**
- Purpose: Stores the local SQLite database file instance.
- Generated: Yes
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-05-26*