# Glossary

## Voice Part Definition
A classification of a singer's vocal range and role within the choir (e.g., Soprano 1, Bass 2). Admins can customize the list of voice parts in settings, defining both a short label (e.g., "S1") and a descriptive full name (e.g., "Soprano 1").

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

## Twilio SMS Integration
A configurable outbound messaging service that allows administrators to input Twilio credentials (Account SID, Auth Token, and From Number) to securely route bulk text message alerts and reminders directly through the server, replacing or bypassing local device-based SMS client handoffs.

## Multi-Work Piece
A sheet music catalog record representing a compound musical work consisting of multiple distinct sections or movements (e.g. masses, cantatas, or oratorios).

## Section Bucket
A top-level classification used to group related voice parts (e.g., "Sopranos" as a bucket for "S1" and "S2"). These buckets are defined in settings and serve as the primary units for automated seating distribution, filtering, and visual identification throughout the application.

## Seating Formation
A global, immutable configuration template managed in system settings that defines the layout strategy (Columns or Rows) and the section sequence used by the auto-paint engine to fill stage layouts.

## Seating Column
A vertical slice of a seating layout extending from the front row to the back row across all tiers.

## Seating Row
A horizontal tier of seats on a stage layout arranged sequentially from front to back.

## Distinct Section Palette
A predefined set of high-contrast color values assigned to section definitions to guarantee clear visual separation on seating charts and grid layouts.

