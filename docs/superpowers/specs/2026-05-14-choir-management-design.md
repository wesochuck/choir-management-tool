# Choir Management Tool - Design Specification

## Overview
A web-based application to help manage a non-profit choir. The tool facilitates singer management, event RSVPs, attendance tracking, and seating chart generation. It is designed to be mobile-first and highly accessible for singers, with powerful responsive tools for administrators.

## Architecture & Tech Stack
*   **Backend/Database/Auth:** PocketBase (SQLite-based, lightweight, provides Auth and API).
*   **Frontend:** React (TypeScript) Single Page Application (SPA).
*   **Design Ethos:** Mobile-first, emphasizing accessibility (large tap targets, high contrast, clear typography) for older users. Admin features are responsive, with complex tools (like seating charts) optimized for larger screens.

## User Roles
*   **Admin:** Directors and managers who organize events, manage the roster, and track attendance.
*   **Singer:** Choir members who view schedules, RSVP, and download calendar events.
*   **Public:** Unauthenticated users accessing the audition signup form.

## Data Model (PocketBase Collections)
1.  **Users:** Handles authentication and role assignment (Admin, Singer).
2.  **Profiles:** Linked 1:1 with Users.
    *   Fields: `Name`, `Phone`, `Voice Part` (S1, S2, A1, A2, T1, T2, B1, B2), `Global Status` (Active/Inactive), `Notes`.
3.  **Events:**
    *   Fields: `title` (Text/Optional), `date` (Date), `location` (Text), `type` (Performance, Rehearsal), `details` (Text), `ParentPerformanceID` (Relation/Self).
4.  **EventRosters:** Junction collection linking a `Profile` to an `Event`.
    *   Fields: `RSVP` (Yes/No/Pending), `Attendance` (Present/Absent/Pending), `SeatID` (String/Nullable), `folderNumber` (String/Nullable), `folderReturned` (Bool).
5.  **Auditions:**
    *   Fields: `Name`, `Contact`, `Time Slot`, `Status`.
6.  **Venues:**
    *   Fields: `name` (Text), `rowCounts` (JSON/Array of seat counts per row, e.g. [12, 15, 18]).
7.  **SeatingCharts:**
    *   Fields: `performance` (Relation to Events), `venue` (Relation to Venues), `layoutOverride` (JSON/Nullable), `assignments` (JSON: Map of SeatIndex to ProfileID).

## Feature Specifications

### Admin Features
*   **Global Roster:**
    *   View and manage all singers.
    *   Update global status (Active vs. Inactive) and manage private notes.
*   **Event Management:**
    *   Create and manage events (Performances and Rehearsals). Rehearsals are explicitly linked to a parent Performance.
    *   **Bulk Creation:** Admins can quickly generate a sequence of rehearsals leading up to a performance. Parameters include the performance date, the target weekday for rehearsals, and the total count. Includes configurable location and time.
*   **Event-Specific Roster:**
    *   Filter the global roster to view only singers who have RSVP'd "Yes" for a specific event.
*   **Attendance Tracking (All Events):**
    *   A simple, mobile-optimized list view for day-of check-ins.
    *   **Crucial Logic:** The check-in list displays all active singers.
    *   Provides a visual warning flag on the Performance roster for any singer who has missed 'n' connected Rehearsals.
    *   **Folder Tracking:** Allows assigning a Folder Number during rehearsals. This number persists across all rehearsals and the final performance in the same concert cycle. Includes a "Returned" toggle for the final hand-off.
*   **Seating Chart (Performances Only):**
    *   A grid-based interface tied to a **Performance** and a **Venue**.
    *   **Singer Pool:** Automatically includes all singers with global status `Active (Current)`.
    *   **Creation/Editing (Desktop Optimized):**
        *   **Vertical Wedge Auto-Paint:** Dynamically allocates blocks of seats for each voice part (S, A, T, B) spanning from front to back rows based on current active counts.
        *   **Manual Assignment:** Admin clicks a sectional seat and picks a singer of that voice part from the active roster.
        *   Allows overriding the venue's default row/seat counts for a specific performance.
    *   **Viewing (Mobile Responsive):** A simplified, high-contrast grid view for mobile users.
    *   **Printing:** A dedicated, high-legibility print layout (Row Number + Names) optimized for standard 8.5" x 11" letter paper.
*   **Communications:**
    *   Send email reminders for events and auditions.
    *   Architecture designed to easily accommodate Twilio SMS integration in the future.

### Singer Features (Mobile-Optimized)
*   **Dashboard:**
    *   View upcoming events they are invited to.
*   **RSVP:**
    *   Simple, large Yes/No buttons to opt-in or decline specific events.
*   **Calendar Integration:**
    *   Generate and download `.ics` files for events to easily add them to personal calendars.

### Public Features
*   **Auditions:**
    *   A public-facing form to select available audition time slots and submit contact information.
