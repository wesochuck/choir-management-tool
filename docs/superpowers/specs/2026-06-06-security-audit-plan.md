# PocketBase Security Audit Plan - Design Doc

**Goal:** Establish a structured, multi-phase methodology for scanning the repository to identify potential security vulnerabilities, focusing on PocketBase API rules, backend hook logic, token stability, and client-side resilience. This is a read-only research plan; no code changes will be made.

## Phased Audit Methodology

### Phase 1: Static Configuration & ACL Audit
**Goal:** Verify that the primary access control layer (API Rules) is correctly implemented for all collections.

*   **Audit Task 1.1: Collection Rule Review**
    *   Inspect `pocketbase/pb_migrations/` for all `list`, `view`, `create`, `update`, and `delete` rules.
    *   Flag any `null` (API-locked) rules that should be role-based to prevent unexpected admin lockouts.
    *   Verify that `users` and `profiles` collections strictly enforce `id = @request.auth.id` for non-admin updates.
*   **Audit Task 1.2: System Keyword Protection**
    *   Scan all collection schemas for fields named `isSystem` or other reserved keywords that could crash the PocketBase expression parser.
*   **Audit Task 1.3: Settings Exposure**
    *   Audit the `appSettings` collection entries. Ensure sensitive keys (`HMAC_SECRET`, `STRIPE_SECRET_KEY`) have `isPublic: false` set in migrations.

### Phase 2: Backend Hook & Logic Analysis
**Goal:** Ensure custom server-side logic in the Goja JS VM prevents authorization bypasses and validates input safely.

*   **Audit Task 2.1: Router Authorization**
    *   Examine custom routes in `pocketbase/pb_hooks_src/` (e.g., `checkoutEndpoints.ts`, `rsvpEndpoints.ts`).
    *   Verify that every router starting with `/api/admin/` explicitly checks `@request.auth.role = 'admin'`.
*   **Audit Task 2.2: Stripe Webhook Integrity**
    *   Review `handleStripeWebhook` for robust signature verification.
    *   Verify idempotency checks (e.g., checking for existing `ticketPurchases` by `stripeSessionId`) to prevent double-fulfillment or replay attacks.
*   **Audit Task 2.3: Goja VM Safety Compliance**
    *   Check for consistent use of `parseJsonField` and `decodeGoBytes` when handling JSON or byte-slice fields from the DB.
    *   Verify use of `{ :param }` syntax in raw SQL queries to prevent injection.

### Phase 3: Signed Tokens & Data Leakage
**Goal:** Secure public-facing "unguarded" routes and prevent sensitive information from being returned in list calls.

*   **Audit Task 3.1: HMAC Token Stability**
    *   Review `pocketbase/pb_hooks_src/hmacTokens.ts` for consistent-time comparisons (`$security.equal`) during signature verification.
    *   Verify that tokens (RSVP, Player, Audition) are scoped to specific records and cannot be used for cross-record access.
*   **Audit Task 3.2: Sensitive Field Filtering**
    *   Audit list/view calls for collections that have public or broad access (e.g., `events`, `musicLibrary`).
    *   Identify fields (phone numbers, internal notes, email addresses) that should be hidden from the default API response or filtered via the `fields` parameter.

### Phase 4: Client-Side Resilience & XSS
**Goal:** Ensure the frontend handles failures gracefully and user input is sanitized before rendering.

*   **Audit Task 4.1: Authentication Interceptor**
    *   Verify that `src/lib/pocketbase.ts` contains the mandatory `afterSend` interceptor to clear `authStore` and redirect on 401/403 errors.
*   **Audit Task 4.2: XSS & Sanitization**
    *   Audit usage of `dangerouslySetInnerHTML` or raw content rendering in public views.
    *   Verify that the `sanitizeHtml` helper is applied to all user-generated content (event details, tribute names, pieces in music library).
*   **Audit Task 4.3: Secure Filter Implementation**
    *   Scan `src/services/` for any instances where variables are interpolated directly into filter strings instead of using `pb.filter()`.

## Deliverables
- A comprehensive security findings report (Markdown).
- Categorization of issues by Severity (Critical, High, Medium, Low) and Phase.
- A list of targeted "Execution Plans" for addressing found issues in a future Directive.
