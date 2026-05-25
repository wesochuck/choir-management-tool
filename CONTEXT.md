# Glossary

## Voice Part Definition
A classification of a singer's vocal range and role within the choir (e.g., Soprano 1, Bass 2). Admins can customize the list of voice parts in settings, defining a short label (e.g., "S1"), a descriptive full name (e.g., "Soprano 1"), and optionally a custom color for visual identity on seating charts.

## RSVP Status
The attendance response provided by or assigned to a singer for a specific event. Can be:
- **Yes (Attending)**: Singer expects to perform or rehearse.
- **No (Declined)**: Singer is unavailable.
- **Pending (No Response)**: The default status indicating no selection has been made yet.

## RSVP Balance
A real-time breakdown of RSVP statuses grouped by voice parts. This allows directors to quickly identify imbalances (e.g., zero or low Tenor 1 attendance) before rehearsals or performances.

## Catalog Lookup URL Template
A configurable URL format defined in settings that enables automatic linking of music piece Catalog IDs to external publisher/sheet music databases (e.g. J.W. Pepper). The placeholder `{catalogId}` is replaced dynamically with the piece's specific catalog number to build the hyperlink.

## Reference Recording
An audio track (typically MP3) attached to a piece in the Music Library. Used by administrators for archive management and made available to singers for practice and learning when the piece is included in their set list.

## Set List
A curated sequence of music pieces and intermissions scheduled to be performed or rehearsed at a specific event. It displays song titles, composers, durations, running timestamps, and linked practice audio, and can be approved by administrators to be visible to singers on their dashboard.

## Twilio SMS Integration
A configurable outbound messaging service that allows administrators to input Twilio credentials (Account SID, Auth Token, and From Number) to securely route bulk text message alerts and reminders directly through the server, replacing or bypassing local device-based SMS client handoffs.

## Multi-Work Piece
A sheet music catalog record representing a compound musical work consisting of multiple distinct sections or movements (e.g. masses, cantatas, or oratorios).

## Section Bucket
A top-level classification used to group related voice parts (e.g., "Sopranos" as a bucket for "S1" and "S2"). These buckets serve as the primary units for standard seating distribution, filtering, and visual identification throughout the application.

## Seating Formation
A global, reusable configuration template managed in system settings that defines the layout strategy (Columns or Rows) and the sequence of categories (either Section Buckets or Voice Parts) used by the auto-paint engine to fill stage layouts. Can optionally be configured in "Voice Part Layout" mode to lay out and mismatch-check by exact voice parts instead of top-level section buckets.

## Seating Column
A vertical slice of a seating layout extending from the front row to the back row across all tiers.

## Seating Row
A horizontal tier of seats on a stage layout arranged sequentially from front to back.

## Distinct Section Palette
A predefined set of high-contrast color values assigned to section and voice part definitions to guarantee clear visual separation on seating charts and grid layouts.

## Unassigned Singer Dock
A shelf at the bottom of the seating chart containing active singers who have not yet been assigned to a seat. It dynamically groups unassigned singers into columns/lanes matching the active formation (either section buckets or voice parts), displaying only the categories that are present in the formation.

## Automated Reminder
A scheduled outbound message (Email or SMS) automatically triggered before an event starts, based on a configurable lead time. It targets active choir members with event details and personalized RSVP links.

## Attendance Report
A post-event summary automatically generated and sent to administrators after a rehearsal or performance. It provides attendance rates, absentee lists, and threshold warnings based on the recorded roster.

## Communication History
A central log of all dispatched messages, including manual bulk emails/SMS and those triggered by automated system tasks.

## Message Draft
A partially composed or unsent message that is saved to the database (with a status of "Draft") for future refinement, recipient filtering, and dispatch.

## Message Template
A reusable layout or pre-written text block containing placeholders that can be loaded instantly in the compose editor to simplify bulk messaging for common scenarios (e.g. event reminders, weather delays, dues alerts).



