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
    *   Fields: `Date`, `Location`, `Type` (Performance, Rehearsal), `Details`, `ParentPerformanceID` (Nullable; used by Rehearsals to link to their main Performance).
4.  **EventRosters:** Junction collection linking a `Profile` to an `Event`.
    *   Fields: `RSVP` (Yes/No/Pending), `Attendance` (Present/Absent/Pending), `SeatID` (String/Nullable), `folderNumber` (String/Nullable), `folderReturned` (Bool).
5.  **Auditions:**
    *   Fields: `Name`, `Contact`, `Time Slot`, `Status`.

## Feature Specifications

### Admin Features
*   **Global Roster:**
    *   View and manage all singers.
    *   Update global status (Active vs. Inactive) and manage private notes.
*   **Event Management:**
    *   Create and manage events (Performances and Rehearsals). Rehearsals are explicitly linked to a parent Performance.
*   **Event-Specific Roster:**
    *   Filter the global roster to view only singers who have RSVP'd "Yes" for a specific event.
*   **Attendance Tracking (All Events):**
    *   A simple, mobile-optimized list view for day-of check-ins.
    *   **Crucial Logic:** The check-in list displays all active singers.
    *   Provides a visual warning flag on the Performance roster for any singer who has missed 'n' connected Rehearsals.
    *   **Folder Tracking:** Allows assigning a Folder Number during rehearsals. This number persists across all rehearsals and the final performance in the same concert cycle (shared via the parent performance's roster entry). Includes a "Returned" toggle for the final hand-off.
*   **Seating Chart (Performances Only):**
    *   A grid-based interface.
    *   **Creation/Editing (Desktop Optimized):** Automatically calculates suggested row sizes based on the total number of RSVP'd "Yes" singers and a user-defined seats-per-row capacity. Admins manually assign singers to grid slots. This complex drag/assign interface is optimized for desktop/tablets.
    *   **Viewing (Mobile Responsive):** The generated seating chart is rendered in a read-only, mobile-friendly format so singers and directors can view it easily on their phones on the day of the performance.
    *   **Printing:** The chart view includes a print stylesheet (or PDF export) designed to format perfectly onto standard 8.5" x 11" letter paper for physical distribution at the venue.
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
