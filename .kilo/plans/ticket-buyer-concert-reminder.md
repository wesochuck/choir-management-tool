# Ticket Buyer Concert Reminder Implementation Plan

## Overview
Implement an automated email reminder system that sends ticket buyers a reminder 24 hours before a concert performance. This includes database changes, backend cron job logic, and frontend UI updates to display and manage these automated tasks.

## Changes Required

### 1. Database Migration
**File:** `pocketbase/pb_migrations/1720000300_add_ticket_reminder_field_and_template.js`
- Add `reminderSent` boolean field (default: false) to `ticketPurchases` collection (`pbc_ticketPurchases_001`)
- Create "Ticket Concert Reminder" system template in `messageTemplates` (`pbc_templates_001`):
  - Title: `Ticket Concert Reminder`
  - Subject: `Reminder: {eventTitle} is tomorrow!`
  - Content: Markdown template with buyer/event details
  - Type: `Email`
  - isSystemTemplate: `true`

### 2. Backend (PocketBase Hooks)
**File:** `pocketbase/pb_hooks_src/generate-main-pb-js.ts`
- Add `ticketBuyerReminderBody` constant with cron job logic:
  - Find Performance events in next 24 hours with ticketing enabled and not archived
  - For each event, find paid ticket purchases where reminderSent != true
  - Fetch the "Ticket Concert Reminder" system template
  - For each purchase:
    - Replace template variables: {buyerName}, {eventTitle}, {eventDate}, {doorsOpenTime}, {quantity}, {choirName}
    - Create emailQueue record with filters: { eventId: event.id, type: "Ticket Buyer Reminder" }
    - Update purchase record: reminderSent = true
  - After processing all purchases for an event, create messages record:
    - filters: { type: "Ticket Buyer Reminder", eventId: event.id }
    - status: "Sent"
  - Register cron job `ticket_buyer_reminder` schedule: `0 * * * *` (hourly)

### 3. Frontend Updates

#### A. Types
**File:** `src/services/communication/types.ts`
- Add `'Ticket Buyer Reminder'` to `AutomatedTaskType` union

**File:** `src/views/admin/communications/types.ts`
- Add `'Ticket Buyer Reminder'` to `AutomatedTask['type']` union

#### B. Sent Task Status Service
**File:** `src/services/communication/sentTaskStatusService.ts`
- Add to `AUTOMATED_STATUS_FILTERS`:
  ```typescript
  'Ticket Buyer Reminder': {
    typeFilter: "filters.type = 'Ticket Buyer Reminder'",
    paramPrefix: 'ticketReminderEventId',
  }
  ```
- Update key prefix mapping in `resolveTasksForType`:
  ```typescript
  const keyPrefix =
    type === 'RSVP Request'
      ? 'rsvp'
      : type === 'Reminder'
      ? 'reminder'
      : type === 'Report'
      ? 'report'
      : 'ticketReminder'; // Ticket Buyer Reminder
  ```
- Add `resolveTasksForType('Ticket Buyer Reminder')` to `Promise.all`

#### C. Automated Communication Tasks Hook
**File:** `src/views/admin/communications/useAutomatedCommunicationTasks.ts`
- Add new task block (after report task block):
  ```typescript
  if (event.type === 'Performance' && event.isTicketingEnabled === true) {
    const scheduledTime = new Date(
      eventDate.getTime() - 24 * 60 * 60 * 1000, // 24 hours before
    );
    const resolution = automatedTaskStatus[`ticket-buyer-reminder-${event.id}`] || 'pending';
    const isResolved = resolution !== 'pending';

    const taskStatus =
      resolution === 'sent'
        ? 'Sent'
        : resolution === 'archived'
        ? 'Archived'
        : 'Scheduled';

    const task: AutomatedTask = {
      id: `ticket-buyer-reminder-${event.id}`,
      type: 'Ticket Buyer Reminder',
      event,
      scheduledTime,
      status: taskStatus,
    };

    if (isResolved || scheduledTime < now) past.push(task);
    else upcoming.push(task);
  }
  ```

#### D. Automated Tasks Panel
**File:** `src/views/admin/communications/AutomatedTasksPanel.tsx`
- Add badge styling for 'Ticket Buyer Reminder' type:
  ```typescript
  {task.type === 'Report'
    ? 'badge-concert'
    : task.type === 'RSVP Request'
    ? 'badge-concert'
    : task.type === 'Ticket Buyer Reminder'
    ? 'badge-concert' // or create new badge variant
    : 'badge-rehearsal'}
  ```
- Add View Recipients handler for this type in onViewTaskRecipients call

#### E. Communication View
**File:** `src/views/admin/CommunicationView.tsx`
- Update `handleViewAutomatedTaskRecipients`:
  - Add case for `'Ticket Buyer Reminder'`:
    ```typescript
    const recipients = await communicationService.resolveTicketBuyerRecipients(task.event.id);
    ```
- Update `handleArchiveAutomatedTask`:
  - Add to `getAutomatedTaskFilterType`:
    ```typescript
    if (taskType === 'Ticket Buyer Reminder') return 'Ticket Buyer Reminder';
    ```
  - Add to `getAutomatedTaskKeyPrefix`:
    ```typescript
    if (taskType === 'Ticket Buyer Reminder') return 'ticketReminder';
    ```

#### F. Communication Service
**File:** `src/services/communicationService.ts`
- Add method:
  ```typescript
  resolveTicketBuyerRecipients: async (eventId?: string): Promise<CommunicationRecipient[]> => {
    if (!eventId) return [];
    const { resolveTicketBuyers } = await import('./communication/ticketBuyerResolver');
    return resolveTicketBuyers(eventId);
  }
  ```
- Add to exported communicationService object

### 4. Verification Steps
1. Run `rtk npm run check:pb-hooks` to verify PocketBase hooks compile
2. Run `rtk npm run lint` and `rtk npm run typecheck` for frontend verification
3. Manual verification:
   - Run local PocketBase migration & reset
   - Verify new template appears in admin UI communications template list
   - Verify "Ticket Buyer Reminder" task appears for performances with ticketing enabled
   - Verify clicking "View Recipients" shows actual ticket buyers for the event

## Dependencies
- Existing ticket purchasing system (`ticketPurchases` collection)
- Existing email queue processing system
- Existing automated tasks infrastructure
- Existing communication service and types

## Notes
- Follows existing patterns from post_event_report cron job and audition hooks
- Uses defensive programming practices per AGENTS.md (try/catch, numeric parsing, etc.)
- Hourly cron ensures idempotency via `reminderSent` flag
- Frontend follows existing automated task patterns for consistency