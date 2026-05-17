# Default Attendance Sort Settings Implementation Plan

We will add a configuration option to the admin **Settings** view to select the default sorting option for the check-in list, and load it dynamically when entering the Attendance Check-in sheet.

## Goal
Provide a way for admins to configure the default sorting strategy (Last Name or Voice Part + Last Name) so that they don't have to manually change the dropdown every time they open the attendance page.

---

## Proposed Changes

### 1. Data Layer

#### [MODIFY] [settingsService.ts](file:///Users/wesosborn/Downloads/choir-management-tool/src/services/settingsService.ts)
- Add `AttendanceSettings` interface.
- Add `DEFAULT_ATTENDANCE_SETTINGS` constant.
- Add `getAttendanceSettings()` and `saveAttendanceSettings()` helper methods.

### 2. View & Form Layers

#### [MODIFY] [SettingsView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/SettingsView.tsx)
- Add `attendanceSettings` state.
- In `useEffect` load block, query `getAttendanceSettings()` and update state.
- In `handleSave()`, call `saveAttendanceSettings(attendanceSettings)`.
- Render a new `AppCard` labeled "Attendance Settings" with a dropdown selector for the default sort mode.

#### [MODIFY] [AttendanceView.tsx](file:///Users/wesosborn/Downloads/choir-management-tool/src/views/admin/AttendanceView.tsx)
- In `useEffect`, query `settingsService.getAttendanceSettings()` to set the default `sortBy` state from the saved database settings when the view is mounted.

---

## Task Breakdown

### Task 1: Update settingsService.ts with Attendance Settings

**Files:**
- Modify: `src/services/settingsService.ts`

- [ ] **Step 1: Export AttendanceSettings type and getters/setters**
Add the interface, default object, and helper methods:
```typescript
export interface AttendanceSettings {
  defaultSort: 'lastName' | 'voicePart';
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  defaultSort: 'lastName',
};

// Inside settingsService:
  async getAttendanceSettings() {
    const setting = await getSetting<AttendanceSettings>('attendance');
    return setting?.value || DEFAULT_ATTENDANCE_SETTINGS;
  },

  async saveAttendanceSettings(value: AttendanceSettings) {
    return await upsertSetting('attendance', value, false);
  },
```

---

### Task 2: Implement Admin Settings UI

**Files:**
- Modify: `src/views/admin/SettingsView.tsx`

- [ ] **Step 1: Import and initialize Attendance Settings state**
Import `DEFAULT_ATTENDANCE_SETTINGS` and hook up standard fetch and save flows:
```typescript
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
```

- [ ] **Step 2: Add to handleSave and rendering markup**
Add the save promise to `Promise.all` and render the settings card:
```tsx
      <AppCard title="Attendance Settings">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Default Sorting Option</label>
          <select
            value={attendanceSettings.defaultSort}
            onChange={(event) => setAttendanceSettings({ defaultSort: event.target.value as 'lastName' | 'voicePart' })}
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="lastName">Last Name</option>
            <option value="voicePart">Voice Part + Last Name</option>
          </select>
          <p className="text-muted" style={{ margin: 0 }}>
            Choose the default sorting option used when opening the check-in sheet.
          </p>
        </div>
      </AppCard>
```

---

### Task 3: Load Default Setting in AttendanceView

**Files:**
- Modify: `src/views/admin/AttendanceView.tsx`

- [ ] **Step 1: Query settingsService on mount**
Use a `useEffect` block to fetch saved attendance settings and populate the default `sortBy` state.

---

## Verification Plan

### Automated Verification
- Run `npx tsc --noEmit` to verify type safety and compilation.

### Manual / Browser Verification
- Go to the **Settings** page.
- Locate the **Attendance Settings** card, select **Voice Part + Last Name**, and click **Save Settings**.
- Navigate to **Attendance Check-in**.
- Verify that the sort dropdown is pre-selected to **Voice Part + Last Name** and that the list displays with voice part separators automatically.
