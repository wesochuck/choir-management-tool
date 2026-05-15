# Choir Management Tool - Project Instructions

These foundational mandates MUST be followed by all agents working on this codebase to ensure technical integrity and prevent recurring infrastructure issues.

## PocketBase & Data Integrity
*   **Stable Migrations:** Always use explicit collection IDs (pattern: `pbc_name_001`) in JavaScript migrations. Never rely on automatically generated IDs or name-based resolution alone, as these can drift during development resets.
*   **Schema First:** Every database change MUST be captured in a migration file immediately. Do not manually edit the database schema via the PocketBase UI without a corresponding migration.
*   **Mandatory Verification:** After any database reset (`rm pb_data`) or migration update, the agent MUST run a diagnostic CURL cycle (Create/Read/Delete) using a fresh superuser token to verify permissions and field presence before reporting success.

## Authentication & Session Management
*   **Stale Token Resilience:** The frontend MUST handle 401 and 403 errors by automatically clearing the `pb.authStore` and redirecting to `/login`. This prevents the "stale token loop" caused by local database resets.
*   **Development Hygiene:** Whenever a database reset occurs, the agent MUST explicitly instruct the user to logout and re-login on the frontend to refresh the browser's local storage.

## Architecture & Code Style
*   **Modular Layers:** Maintain strict separation between:
    *   `src/services/`: Pure PocketBase API calls.
    *   `src/hooks/`: State coordination and business logic.
    *   `src/components/`: Pure presentational "dumb" components.
*   **Type Safety:** Use shared TypeScript interfaces for all PocketBase records to ensure consistency between the backend schema and frontend state.
