# Glossary

## Voice Part Definition
A classification of a singer's vocal range and role within the choir (e.g., Soprano 1, Bass 2). Admins can customize the list of voice parts in settings, defining a short label (e.g., "S1"), a descriptive full name (e.g., "Soprano 1"), and optionally a custom color for visual identity on seating charts.

## Personalized Magic Link
A secure, uniquely generated URL sent to a singer that allows them to perform a specific action (e.g., RSVP, respond to a poll, access the music player) without requiring a standard password login. These links use signed tokens to verify the singer's identity and the intended action.

## Engagement Poll
A targeted question sent to singers via Personalized Magic Links to gather volunteers or information for specific event-related tasks (e.g., moving risers) or organizational needs (e.g., general skill sets). Polls are created directly within the Communications interface during message composition. Singers can toggle or edit their responses at any time via their personalized link.

## Voluntary Assignment
A record of a singer's affirmative response to an Engagement Poll. These assignments allow administrators to track volunteer names and total counts to assess organizational capability for specific tasks.

## Polls Dashboard
A central management interface for reviewing affirmative responses to Engagement Polls. The dashboard provides an overview of volunteer counts and detailed lists of specific singer names to help administrators assess organizational capability. Event-linked polls are grouped by performance/rehearsal and automatically archive when the event passes.

## RSVP Status
The attendance response provided by or assigned to a singer for a specific event. Can be:
- **Yes (Attending)**: Singer expects to perform or rehearse.
- **No (Declined)**: Singer is unavailable.
- **Pending (No Response)**: The default status indicating no selection has been made yet.

## RSVP Balance
A real-time breakdown of RSVP statuses grouped by voice parts. This allows directors to quickly identify imbalances (e.g., zero or low Tenor 1 attendance) before rehearsals or performances.

## RSVP Decline Notice
An automated email notification sent to administrators who have opted to receive alerts when a singer declines a rehearsal or performance RSVP. It includes the singer's name, voice part, the event, and any reason or note provided by the singer.

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

## Event Cloning
A function that duplicates an existing Performance, copying its title, date/time, details, and venue into a new event record with RSVPs (Event Roster responses) copied over, while keeping the set list empty, setting attendance/folder stats to default, and keeping its initial RSVP state closed.

## Seating Chart
A physical arrangement of singers in rows and columns on a stage or venue layout. A single performance can support multiple distinct seating charts, each identified by a custom user-defined name (e.g., "Chamber Choir", "Combined Finale"). Each seating chart is linked to a Seating Formation, which dynamically filters the unassigned singer pool and available seats to match only the voice parts or section buckets specified in that formation.

## Standing Neighbors HUD
A user interface component in the seating finder that displays the names and voice parts of the immediate standing neighbors (Left, Right, Behind, In Front) relative to the singer's assigned seat.

## Seating Grid Mirroring
A layout rendering strategy for the stage finder that positions Row 1 (the physical front row of the stage, closest to the director and audience) at the bottom of the screen, and the last row (the physical back row/tier) at the top of the screen, aligning with a singer's forward-facing perspective looking toward the podium.

## Performance Recency
The elapsed time since a music piece was last performed. In the music library, this is calculated dynamically using the date of the most recent linked performance event.

## Performance Recency Filter
A search control in the music catalog that filters pieces based on how recently they were performed (e.g. within the last 1, 2, or 3 years, not performed for over 3 or 5 years, or never performed).

## Composer
The individual(s) who wrote the original musical work. Stored in the `composer` field of a music library piece.

## Arranger
The individual(s) who adapted or arranged the original musical work for a specific vocal setting or instrumentation. Stored in the new `arranger` field of a music library piece.

## Calendar Subscription Feed
A secure, personalized iCalendar (.ics) feed URL that allows singers to sync their choir event schedules (including rehearsals and performances) directly into external calendar applications.

## Calendar Salt
A unique, cryptographically random string stored on a singer's profile that is signed into their Calendar Subscription Feed URL. Re-generating this salt instantly invalidates any previously shared subscription links.

## Audition Inquiry
A request submitted by a prospective singer via the public audition form, detailing their name, contact information, preferred audition time slots, voice part, and musical experience.

## Singer Resource
A document (such as a PDF handbook) or an external hyperlink (such as a Google Drive folder) managed by administrators and made available to all active singers under the Resources section of their dashboard.

## Ticket Bundle
An administrative grouping of multiple upcoming performances offered for sale as a single package (e.g., a "Season Ticket"). A bundle defines its own single, fixed price, total capacity, and public marketing details. The effective available capacity of a bundle is strictly limited by the lowest remaining capacity of any individual performance included in the package, preventing accidental overselling of popular events. A bundle automatically expires and becomes unavailable for purchase once the first included performance has occurred.

## Season Ticket
A bundled purchase option that allows a buyer to purchase admission to a defined set of upcoming performances in a single transaction. Upon successful checkout, the system automatically generates individual standard Will Call Ticket Purchase records for each included performance, ensuring compatibility with existing door-entry, capacity, and communication logic. These individual records are linked by a shared Stripe transaction ID, meaning refunds are processed on an all-or-nothing basis for the entire package.

## Will Call Ticket Purchase
A record of a successful general admission ticket transaction for a Performance, detailing the buyer's name, email, purchased quantity, payment status, and Stripe session reference. Used by administrators to manage door admission via a printed or digital will call list.

## Ticketing Configuration
Settings defined on a Performance event that enable ticket sales, set the single ticket price, and specify the maximum ticket capacity for the event.

## Advance Ticket Price
The price charged for a ticket purchased online in advance of the performance day.

## Day-of Ticket Price
The higher price charged for a ticket purchased online on the day of the performance.

## Discount Code
A code entered by a buyer at checkout to apply a percentage or fixed discount to their ticket purchase, leveraging Stripe's native Checkout Promotion Codes.



