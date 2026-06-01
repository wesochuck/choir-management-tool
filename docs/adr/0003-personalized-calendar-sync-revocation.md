# Personalized Calendar Sync with Cryptographic Token Revocation

We chose to implement a personalized calendar sync feed for singers (exposing a standard iCalendar `.ics` feed subscription at `/api/calendar/feed`) and secure it using a custom dynamic token signed with the system's `HMAC_SECRET` incorporating a new `calendarSalt` field on the `profiles` collection. If a singer's subscription link is leaked or shared, they can regenerate it instantly from their settings panel by updating this salt value, which invalidates all previously shared links without affecting their other profile data. Additionally, we automatically cascade RSVP status from parent performance events to linked rehearsal events in the calendar feed (unless overridden with a specific rehearsal RSVP) to align the user's personal calendar with their actual rehearsal requirements when they RSVP to a concert.

## Status
Accepted

## Considered Options
1. **Global Feed Subscription**: A single, unauthenticated `.ics` feed of all choir events. Rejected because it cannot provide personalized details (like specific RSVPs, seating columns/rows, or custom set lists) and leaks internal rehearsals to anyone who acquires the URL.
2. **Profile Updated Signature**: Hashing the signature with the existing `profile.updated` timestamp to allow revocation. Rejected because any standard profile update (such as editing a phone number or updating a photo) would break the calendar subscription feed and force the user to resubscribe.
3. **Dedicated Revocation Field (`calendarSalt`)**: Adding a custom, independent random token salt field on `profiles` specifically for calendar generation. Accepted because it isolates calendar state changes from profile edits and allows clean, targeted link resets.
