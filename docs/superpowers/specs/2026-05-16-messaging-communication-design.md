# Design Spec: Messaging & Communication Hub

**Date:** 2026-05-16
**Status:** Implemented

## Overview
A centralized administrative hub for managing choir-wide communication via Email (SMTP) and SMS (Twilio). The system allows for flexible recipient filtering, rich text message composition, and historical review of sent messages.

## Goals
- Provide a single place for admins to send announcements.
- Support both Email and SMS delivery.
- Allow filtering recipients by Event participation, Voice Part, or Global Status.
- Maintain a history of sent messages for review and re-use.
- Enable admin configuration of delivery credentials.

## Architecture

### 1. Data Model (PocketBase)

#### `messages` Collection (New)
Stores a log of all sent communications.
- `id`: System ID
- `subject`: Text (Email subject line)
- `content`: Text (Markdown content)
- `type`: Select (`Email`, `SMS`, `Both`)
- `recipients`: JSON (Snapshot of recipient details: `[{name, email, phone}]`)
- `filters`: JSON (Metadata about filters used to generate the list)
- `sender`: Relation (`users`, Admin who sent the message)
- `created`: Autodate

#### `appSettings` Collection (Existing)
Updated to store credentials.
- `key`: "communications_config"
- `value`: JSON
  ```json
  {
    "smtp": {
      "host": "",
      "port": 587,
      "user": "",
      "pass": "",
      "from": ""
    },
    "twilio": {
      "sid": "",
      "token": "",
      "from": "",
      "enabled": false
    }
  }
  ```

### 2. UI Components

#### `CommunicationView.tsx` (New)
The main layout using `PageLayout` with a 3-tab navigation system.

- **Tab 1: Compose**
  - **Recipient Selector:**
    - Filter by Event (All, RSVP Yes, RSVP No, RSVP Pending).
    - Filter by Voice Part (S1, S2, A1, A2, T1, T2, B1, B2).
    - Filter by Global Status (Active Current, Active Future, Inactive).
    - Individual selection/removal.
  - **Channel Selector:** Toggle for Email and/or SMS.
  - **Editor:** Standard WYSIWYG editor with Markdown output support.
  - **Live Preview:** Renders the message as it will appear to recipients.
  - **Send Button:** Triggers the dispatch sequence and logs to history.

- **Tab 2: History**
  - **List View:** Table of past messages sorted by date (newest first).
  - **Detail View:** Side-panel or modal showing full content and recipient list.
  - **Action:** "Copy to Draft" button to pre-populate the Compose tab.

- **Tab 3: Settings**
  - **Credentials Form:** Fields for SMTP and Twilio configuration.
  - **Test Button:** "Send Test Email/SMS" to verify credentials.
  - **Templates:** Manage default signatures or message headers.

### 3. Service Layer

#### `communicationService.ts` (New)
- `getMessages()`: Fetch history.
- `saveMessage(data)`: Create a log entry.
- `sendBulkMessage(recipients, content, type)`: Logic for iterating through recipients and triggering delivery.
  - *Note:* Frontend will likely trigger a backend action or handle sequential service calls depending on the environment setup.

## Success Criteria
1. Admin can select specific voice parts and send them an email.
2. Admin can see a message sent last week and copy its content to a new draft.
3. Admin can update SMTP credentials without touching code.
4. Messages are logged correctly in the `messages` collection.

## Implementation Notes
- Implemented in `src/views/admin/CommunicationView.tsx`.
- Service layer lives in `src/services/communicationService.ts`.
- PocketBase collection migration is `pocketbase/pb_migrations/1715690009_messages.js`.
