# First Time Experience (FTE) Setup Wizard Plan

This document outlines the First Time Experience (FTE) wizard designed to guide users through configuring a fresh installation of the Choir Management Tool. It handles creating the initial admin account and configuring basic settings and features before allowing access to the dashboard.

## 1. Setup Trigger & Detection
- **Detection Mechanism:** The application will check if the `appSettings` collection is completely empty (specifically, if the `choir_name` setting does not exist).
- **Redirection:** If `appSettings` is empty, unauthenticated visitors hitting the root `/` or `/login` will be immediately redirected to the `/setup` route.

## 2. Multi-Step Wizard UI
The `/setup` route will render a multi-step setup component (`SetupView.tsx`):

### Step 1: Admin Account Creation
- **Inputs:** Email and Password.
- **Action:** Calls the special PocketBase bootstrap API (`pb.collection('_superusers').create(...)`) to create the initial admin account. 
- **Follow-up:** Automatically authenticates the new admin and creates a corresponding record in the `users` collection with the `admin` role to ensure regular app logic works correctly.

### Step 2: Basic Settings
- **Inputs:** 
  - Choir Name
  - Performer Label (e.g., "Singer", "Player")
  - Timezone
  - Support Email
- **Action:** Uses the `settingsService` to upsert these core values into the `appSettings` collection.

### Step 3: Feature Toggles
- **Inputs:** Toggle switches for modules such as:
  - Ticketing
  - Donations
  - Auditions
  - Polls
  - RSVPs
- **Action:** Upserts the corresponding module configuration settings.

### Step 4: Review & Finish
- **Presentation:** Summarizes the setup configuration.
- **Action:** A "Complete Setup" button that redirects the user directly to the Admin Dashboard (`/dashboard`).

## 3. Interruption & Edge Case Handling
If the setup process is interrupted (e.g., the browser tab is closed after Step 1 but before Step 2):
- When the user returns, the application will detect that `appSettings` is still empty but the `_superuser` account exists.
- The wizard will prompt the user to log in with the credentials they just created.
- Once authenticated, it will immediately resume the wizard at Step 2 (Basic Settings) so they do not have to start over.
