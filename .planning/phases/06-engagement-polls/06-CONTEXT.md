# Phase 06: Engagement Polls - Requirements & Decisions

## Context
Extend the secure, no-login RSVP mechanism to allow for "Mini Polls" (Engagement Polls). These allow administrators to gather volunteers for specific tasks (risers, equipment, snacks) without cluttering the main attendance roster.

## Requirements
1.  **Poll Creation**: Integrated solely within the **Communications** area. 
    *   Admins can create a new poll (Question + optional Event link) while composing an email or SMS.
    *   Visual "Insert Poll" picker in the composer toolbar.
2.  **Singer Experience**:
    *   Personalized Magic Link sent via email/SMS.
    *   Landing page shows the question and a "Volunteer" toggle.
    *   Toggling response (Yes/No) must be supported.
3.  **Polls Dashboard (Admin)**:
    *   Dedicated view for reviewing responses.
    *   Overview: Aggregate volunteer counts grouped by Event.
    *   Detail: List of specific singer names for each poll.
    *   Auto-Archive: Event-linked polls hidden once the event date passes.
4.  **Singer Dashboard Integration**:
    *   Logged-in singers can see a list of "Open Polls" on their dashboard.
    *   Shows the poll question and their current response (if any).
    *   Allows submitting or changing responses directly from the dashboard.
5.  **Database**:
    *   `polls` collection: `id`, `question`, `eventId` (optional), `creatorId`, `created`, `updated`.
    *   `poll_responses` collection: `id`, `pollId`, `profileId`, `status` (Yes/No), `updated`.

## UI Design Decisions
*   **Placeholder Format**: Visual picker inserts a human-readable "Magic Link" button placeholder.
*   **Clutter Management**: Response lists are only accessible via the Dashboard, keeping the Event Roster focused on attendance.
