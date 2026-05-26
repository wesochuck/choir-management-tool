# Technology Stack

**Analysis Date:** 2026-05-26

## Languages

**Primary:**
- TypeScript ~6.0.2 - Frontend logic and backend PocketBase hooks (`src/**/*.ts(x)`, `pocketbase/pb_hooks_src/**/*.ts`)

**Secondary:**
- HTML/CSS - UI layout and styling (`index.html`, `src/**/*.css`, inline styles)
- JavaScript - Compiled backend hooks and test runners (`test/register.js`)

## Runtime

**Environment:**
- Node.js LTS (v20+)
- PocketBase Goja JS VM - Server-side hook execution

**Package Manager:**
- npm (v9+)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- React ^19.2.6 - Frontend user interface (`src/`)
- PocketBase 0.36.9 (assumed per workspace rules) - Backend, database, authentication, and file storage API (`pocketbase/`)

**Testing:**
- Node.js Native Test Runner (`node --test`) - Unit and integration testing (`test/`)

**Build/Dev:**
- Vite ^8.0.12 - Dev server and frontend bundler (`vite.config.ts`)
- TypeScript Compiler (`tsc -b`) - Type checking

## Key Dependencies

**Critical:**
- `pocketbase` (^0.26.9) - Official JS SDK for communicating with the backend. Note: Workspace rules mandate treating the deployed server version as 0.36.9.
- `react-router-dom` (^7.15.1) - Frontend client-side routing.
- `@dnd-kit/core` (^6.3.1), `@dnd-kit/sortable`, `@dnd-kit/utilities` - Drag-and-drop utilities, likely used for seating charts and music set lists.

**Infrastructure:**
- ESLint (^10.3.0) & `@typescript-eslint` - Code quality and linting.

## Configuration

**Environment:**
- Standard `.env` variables loaded via Vite or Node.js.
- Secrets for CI/CD managed via GitHub Actions Secrets (e.g., `POCKETHOST_USERNAME`, `POCKETHOST_PASSWORD`).

**Build:**
- `vite.config.ts` for build and dev settings.
- `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json` for strict TypeScript typing rules.
- `.github/workflows/main.yml` for automated CI/CD build scripts.

## Platform Requirements

**Development:**
- Node.js LTS installed locally.
- Optional: Local PocketBase executable (if not relying entirely on hosted backend during local frontend dev).

**Production:**
- PocketHost (`pockethost.io`) as the managed hosting provider.

---

*Stack analysis: 2026-05-26*
