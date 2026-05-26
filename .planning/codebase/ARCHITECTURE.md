<!-- refreshed: 2026-05-26 -->
# Architecture

**Analysis Date:** 2026-05-26

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                    │
├──────────────────┬──────────────────┬───────────────────────┤
│    Views         │   Components     │      Hooks            │
│  `src/views/`    │ `src/components/`│   `src/hooks/`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│         `src/services/`                                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PocketBase Backend (Go/SQLite + Goja JS VM)                 │
│  `pocketbase/pb_hooks/` / `pocketbase/pb_migrations/`        │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App Router | Lazy-loads views, checks auth logic via `ProtectedRoute`. | `src/App.tsx` |
| View Components | Container for distinct routes, mostly coordinates smaller components. | `src/views/` |
| Presentational Components | "Dumb" components relying on props, no direct data fetching. | `src/components/` |
| Custom Hooks | State coordination, UI-centric business logic. | `src/hooks/` |
| Services | Pure PocketBase API calls, data formatting. | `src/services/` |
| Backend Hooks | Goja VM JS scripts providing API custom endpoints, cron jobs, DB triggers. | `pocketbase/pb_hooks/main.pb.js` |

## Pattern Overview

**Overall:** Client-Server Application (React SPA over PocketBase backend)

**Key Characteristics:**
- Strict three-tier frontend logic separation: Views/Components -> Hooks -> Services.
- Heavy reliance on PocketBase JS SDK (`pocketbase.ts`) for data access instead of custom REST.
- Asynchronous data loading with React Router DOM + lazy-loading views.
- Backend logic pushed to event hooks (`pb_hooks`) rather than an intermediate backend server.

## Layers

**Views:**
- Purpose: Map routes to large page containers.
- Location: `src/views/`
- Contains: Layout wrappers, composed UI screens.
- Depends on: `src/hooks/`, `src/components/`
- Used by: `src/App.tsx`

**Hooks:**
- Purpose: State coordination, connecting services to React components.
- Location: `src/hooks/`
- Contains: Custom React hooks (e.g., `useAttendance.ts`, `useEvents.ts`).
- Depends on: `src/services/`
- Used by: `src/views/`, `src/components/`

**Services:**
- Purpose: Execute pure data queries & mutations to PocketBase.
- Location: `src/services/`
- Contains: Service classes/functions interacting with DB SDK (e.g., `eventService.ts`).
- Depends on: `src/lib/pocketbase.ts`
- Used by: `src/hooks/`

**Backend Hooks:**
- Purpose: Server-side validation, custom endpoints, automated dispatch (emails).
- Location: `pocketbase/pb_hooks/`
- Contains: Goja JS VM scripts (`main.pb.js`, `auditions.pb.js`).
- Depends on: PocketBase core internals
- Used by: PocketHost execution engine

## Data Flow

### Primary Request Path

1. User interacts with View (`src/views/admin/EventsView.tsx`)
2. View calls Custom Hook (`src/hooks/useEvents.ts`)
3. Hook executes Service function (`src/services/eventService.ts`)
4. Service queries PocketBase (`src/lib/pocketbase.ts` -> SDK)
5. PocketBase processes hook (e.g., `pocketbase/pb_hooks/main.pb.js`) and touches SQLite.

### Background Task Flow

1. Cron job trigger (`pocketbase/pb_hooks/main.pb.js`)
2. Job script filters database records via VM functions.
3. Operations like SMTP dispatch (`app.newMailClient().send(...)`).
4. Result logged back to Database queue logic.

**State Management:**
- React Context (`AuthContext`, `DialogContext`) used for global UI states.
- Local component state via `useState`/`useReducer`. No Redux/Zustand is visible.

## Key Abstractions

**PocketBase Client:**
- Purpose: Provides typed boundaries over raw network queries. Handles stale tokens globally.
- Examples: `src/lib/pocketbase.ts`
- Pattern: Singleton exported instance.

**Goja VM Helpers:**
- Purpose: Safely manipulates data specific to PocketBase's Go runtime.
- Examples: `decodeGoBytes`, `parseJsonField` within `pocketbase/pb_hooks/main.pb.js`.
- Pattern: Pure utility functions.

## Entry Points

**Frontend Bootstrapper:**
- Location: `src/main.tsx`
- Triggers: Browser loading `index.html`
- Responsibilities: Wraps the app in Context Providers (Auth, Dialog, etc.) and injects into DOM.

**App Router:**
- Location: `src/App.tsx`
- Triggers: Loaded by `main.tsx`
- Responsibilities: Defines React-Router `<Routes>`, code-splitting logic, and protected routes.

**Backend Initialization:**
- Location: `pocketbase/pb_hooks/main.pb.js`
- Triggers: PocketBase startup
- Responsibilities: Registers backend API endpoints, `cronAdd` scripts, and collection hooks.

## Architectural Constraints

- **Threading:** PocketBase Goja VM executes in constrained execution environments. It does not support native NodeJS `Intl` features identically and requires defensive Date/Timezone manipulation helpers.
- **Global state:** Token management handled in frontend `AuthContext`.
- **Backend Memory Limits:** Goja hook executions must be self-contained; helpers cannot safely rely on global memory or process scopes reliably.
- **Security Check:** Always check unencoded ampersands `&` inside generated tokens since URL parsing will split them.

## Anti-Patterns

### Goja Bytes Parsing
**What happens:** Running `JSON.stringify` or `.toString()` directly on PocketBase JSON fields.
**Why it's wrong:** PocketBase returns Go `[]byte` objects which serialize as numerical arrays (e.g., `[91, 123]`) breaking UI.
**Do this instead:** Use `decodeGoBytes` or `parseJsonField` from `pocketbase/pb_hooks/main.pb.js` to decode them.

### Mixed UI and Data Fetching
**What happens:** Views calling `pb.collection('x').getFullList()` directly in `useEffect`.
**Why it's wrong:** Tightly couples UI with database, breaking layer separation.
**Do this instead:** Add business operations to `src/services/` and wrap state inside `src/hooks/`.

## Error Handling

**Strategy:** Type-safe generic error normalizers combined with defensive global catch mechanisms.

**Patterns:**
- `catch` block variables must be typed `unknown`, e.g., `const message = err instanceof Error ? err.message : String(err)`.
- Explicit `any` casting is prohibited globally.
- API requests utilize global interceptor `pb.beforeSend` / `pb.afterSend` inside `src/lib/pocketbase.ts` to invalidate stale tokens and prompt logout rather than forcing specific views to handle 401s uniquely.

## Cross-Cutting Concerns

**Logging:** Backend failures checked in PocketHost `pb_debug.log`. Hook errors can throw after row-writes. Front-end primarily uses `console.error` wrapped inside error boundaries (`App.tsx`).
**Validation:** Types defined in `/src/types/` enforce frontend schemas.
**Authentication:** Managed via `src/contexts/AuthContext.tsx` bridging `pb.authStore`.

---

*Architecture analysis: 2026-05-26*