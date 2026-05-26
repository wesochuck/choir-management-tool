# Coding Conventions

**Analysis Date:** 2026-05-26

## Naming Patterns

**Files:**
- Components and Views: PascalCase (`LoginView.tsx`, `AppCard.tsx`, `AuditionModal.tsx`)
- Hooks: camelCase with `use` prefix (`useEvents.ts`, `useAttendance.ts`)
- Services: camelCase with `Service` suffix (`eventService.ts`, `playerService.ts`)
- Utilities: camelCase with `Utils` suffix or descriptive name (`stringUtils.ts`, `pocketbase.ts`)
- Contexts: PascalCase with `Context` suffix (`AuthContext.tsx`, `DialogContext.tsx`)

**Functions:**
- Standard functions: camelCase (`fetchEvents`, `formatPocketBaseError`)
- Components: PascalCase (`export function LoginView() { ... }`)
- Hooks: camelCase starting with `use` (`useEvents`)

**Variables:**
- General: camelCase (`isLoading`, `events`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_VOICE_PARTS`)
- React State: `[value, setValue]` pattern (`const [events, setEvents] = useState([])`)

**Types:**
- Interfaces and Types: PascalCase (`Event`, `VoicePartDef`)
- Props: PascalCase with `Props` suffix (`AppCardProps`)

## Code Style

**Formatting:**
- Tool used: Prettier (indicated by common project patterns, though config file was not found, the code is consistent)
- Key settings: Semi-colons used, single quotes used for strings.

**Linting:**
- Tool used: ESLint
- Key rules:
    - `@typescript-eslint/no-explicit-any`: Error (Mandatory)
    - `react-hooks/rules-of-hooks`: Recommended
    - `react-refresh/only-export-components`: Off

## Import Organization

**Order:**
1. React and standard library imports (`react`, `node:test`)
2. External dependencies (`pocketbase`, `react-router-dom`)
3. Internal services and hooks (`../services/...`, `../hooks/...`)
4. Internal components and assets (`../components/...`, `../assets/...`)
5. Types and constants (`./types`, `./settingsService`)

**Path Aliases:**
- Relative paths are primarily used (`../`, `./`)

## Error Handling

**Patterns:**
- Centralized PocketBase error formatting in `src/lib/pocketbase.ts` via `formatPocketBaseError`.
- `afterSend` interceptor in `src/lib/pocketbase.ts` for handling 401/403 and stale tokens.
- Hook-level error state: `const [error, setError] = useState<string | null>(null)`.
- Defensive parsing of JSON fields using `parseJsonField` from `src/lib/pocketbaseJson.ts`.
- Catching errors in hooks and re-throwing with user-friendly messages.

## Logging

**Framework:** `console`

**Patterns:**
- Errors logged with specific prefixes in interceptors (e.g., `[PB 400]`, `[PB AUTH]`).
- Warning when sessions are cleared.

## Comments

**When to Comment:**
- Complexity: Explaining logic in complex algorithms (e.g., `seatingAlgorithm.ts`, `playerService.ts` mapping logic).
- Infrastructure: Explaining workarounds for PocketBase/Goja VM limitations.

**JSDoc/TSDoc:**
- Used for service methods and complex utility functions to describe parameters and return values.

## Function Design

**Size:** Hooks and service methods are kept relatively small and focused. Views can be larger (300-600+ lines) due to complex UI composition.

**Parameters:** Prefer object destructuring for multiple parameters in components and complex functions.

**Return Values:** Hooks typically return an object containing both state and action methods.

## Module Design

**Exports:**
- Services: Exported as a single `const serviceName = { ... }` object.
- Components and Hooks: Usually named exports (`export const useEvents = ...`).
- Utilities: Named exports for individual functions.

**Barrel Files:** Not extensively used; direct imports are preferred.

## Settings-Driven Logic (Voice Parts & Sections)

**MANDATORY:**
- NEVER hardcode voice part labels (e.g., 'S1', 'A2') or section names.
- Always use the `useVoiceParts` hook in the frontend to retrieve the current choir configuration.
- Use `settingsService.getVoicePartsAndSections()` for backend/service-level logic.

---

*Convention analysis: 2026-05-26*
