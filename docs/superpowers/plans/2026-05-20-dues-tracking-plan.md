# Seasonal Dues Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a lightweight seasonal dues tracking system, allowing admins to track payment status (Paid/Unpaid) for each singer on a per-season basis.

**Architecture:** A new PocketBase collection `seasonalDues` tracks payment status linked to the `profiles` collection. The global `currentSeason` string is stored in the `roster` settings. The Roster Admin page integrates these pieces via a new `useDues` hook to display and toggle the dues checkbox natively in the roster table.

**Tech Stack:** React (TypeScript), PocketBase (Migrations & API)

---

### Task 1: Create PocketBase Migration for `seasonalDues`

**Files:**
- Create: `pocketbase/pb_migrations/1716200000_add_seasonal_dues.js`

- [ ] **Step 1: Write the migration script**

Create the migration file for the `seasonalDues` collection using an explicit `pbc_seasonalDues_001` ID.

```javascript
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = new Collection({
    id: "pbc_seasonalDues_001",
    name: "seasonalDues",
    type: "base",
    fields: [
      {
        name: "id",
        type: "text",
        primaryKey: true,
        required: true,
        system: true,
        pattern: "^[a-z0-9]+$"
      },
      {
        name: "profile",
        type: "relation",
        required: true,
        presentable: false,
        options: {
          collectionId: "pbc_3414089001", // profiles collection
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        name: "season",
        type: "text",
        required: true
      },
      {
        name: "paid",
        type: "bool",
        required: false
      }
    ],
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seasonalDues_001");
  app.delete(collection);
});
```

- [ ] **Step 2: Commit**

```bash
git add pocketbase/pb_migrations/1716200000_add_seasonal_dues.js
git commit -m "feat(db): add seasonalDues collection"
```

---

### Task 2: Create Dues Service

**Files:**
- Create: `src/services/duesService.ts`

- [ ] **Step 1: Implement the Dues Service**

Write the explicit PocketBase API interactions.

```typescript
import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Profile } from './profileService';

export interface SeasonalDue extends RecordModel {
  profile: string;
  season: string;
  paid: boolean;
  expand?: {
    profile?: Profile;
  };
}

export const duesService = {
  async getDuesForSeason(season: string) {
    if (!season) return [];
    return await pb.collection('seasonalDues').getFullList<SeasonalDue>({
      filter: pb.filter('season = {:season}', { season }),
    });
  },

  async updateDues(profileId: string, season: string, paid: boolean) {
    try {
      const existing = await pb.collection('seasonalDues').getFirstListItem<SeasonalDue>(
        pb.filter('profile = {:profileId} && season = {:season}', { profileId, season })
      );
      return await pb.collection('seasonalDues').update<SeasonalDue>(existing.id, { paid });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
        return await pb.collection('seasonalDues').create<SeasonalDue>({
          profile: profileId,
          season,
          paid,
        });
      }
      throw err;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/duesService.ts
git commit -m "feat(services): implement duesService"
```

---

### Task 3: Add `currentSeason` to Settings

**Files:**
- Modify: `src/services/settingsService.ts`
- Modify: `src/views/admin/SettingsView.tsx`

- [ ] **Step 1: Extend `RosterSettings` in `src/services/settingsService.ts`**

Update `RosterSettings` interface to include `currentSeason`.

```typescript
// Add `currentSeason?: string;` to RosterSettings interface
export interface RosterSettings {
  defaultStatus: string;
  defaultSort: 'lastName' | 'voicePart';
  defaultRsvpSort?: 'lastName' | 'voicePart';
  currentSeason?: string;
}

// Update DEFAULT_ROSTER_SETTINGS
export const DEFAULT_ROSTER_SETTINGS: RosterSettings = {
  defaultStatus: '',
  defaultSort: 'lastName',
  defaultRsvpSort: 'lastName',
  currentSeason: '',
};
```

- [ ] **Step 2: Update `SettingsView.tsx` with Season Management card**

In `src/views/admin/SettingsView.tsx`, immediately following the `Roster Settings` `<AppCard>`, insert a new `AppCard` for Season Management.

```tsx
      <AppCard title="Season Management">
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Current Season</label>
          <input
            type="text"
            value={rosterSettings.currentSeason || ''}
            onChange={(event) => setRosterSettings({ ...rosterSettings, currentSeason: event.target.value })}
            placeholder="e.g. Fall 2026"
            className="card"
            style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
          />
          <p className="text-muted" style={{ margin: 0 }}>
            Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
          </p>
        </div>
      </AppCard>
```

- [ ] **Step 3: Commit**

```bash
git add src/services/settingsService.ts src/views/admin/SettingsView.tsx
git commit -m "feat(settings): add currentSeason to roster settings"
```

---

### Task 4: Create `useDues` Hook

**Files:**
- Create: `src/hooks/useDues.ts`

- [ ] **Step 1: Write the hook**

Create the custom hook to fetch and manage dues state.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { duesService, type SeasonalDue } from '../services/duesService';
import { settingsService } from '../services/settingsService';

export function useDues() {
  const [duesMap, setDuesMap] = useState<Record<string, SeasonalDue>>({});
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await settingsService.getRosterSettings();
      const season = settings?.currentSeason || '';
      setCurrentSeason(season);

      if (season) {
        const duesList = await duesService.getDuesForSeason(season);
        const map: Record<string, SeasonalDue> = {};
        for (const d of duesList) {
          map[d.profile] = d;
        }
        setDuesMap(map);
      } else {
        setDuesMap({});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDues = async (profileId: string, paid: boolean) => {
    if (!currentSeason) return;
    try {
      // Optimistic update
      setDuesMap(prev => ({
        ...prev,
        [profileId]: { ...prev[profileId], profile: profileId, season: currentSeason, paid } as SeasonalDue
      }));
      
      const updated = await duesService.updateDues(profileId, currentSeason, paid);
      setDuesMap(prev => ({ ...prev, [profileId]: updated }));
    } catch (e) {
      console.error("Failed to update dues", e);
      load(); // revert optimistic update on failure
    }
  };

  return { currentSeason, duesMap, toggleDues, isLoading, refresh: load };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDues.ts
git commit -m "feat(hooks): create useDues hook"
```

---

### Task 5: Integrate Dues in Roster View and Table

**Files:**
- Modify: `src/views/admin/RosterView.tsx`
- Modify: `src/components/admin/RosterTable.tsx`

- [ ] **Step 1: Connect `useDues` to `RosterView.tsx`**

Add the hook and pass its properties to `RosterTable`.

```typescript
// Add import at the top of src/views/admin/RosterView.tsx
import { useDues } from '../../hooks/useDues';

// Inside RosterView component:
export default function RosterView() {
  const { profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles();
  const { currentSeason, duesMap, toggleDues } = useDues();
  // ...

  // Update RosterTable prop assignments in the JSX render:
      <RosterTable 
        profiles={sortedProfiles} 
        onEdit={handleEdit} 
        onPhotoChange={refresh} 
        currentSeason={currentSeason}
        duesMap={duesMap}
        onToggleDues={toggleDues}
      />
```

- [ ] **Step 2: Update `RosterTable.tsx` Props**

```typescript
// Update RosterTableProps interface in src/components/admin/RosterTable.tsx
import type { SeasonalDue } from '../../services/duesService';

interface RosterTableProps {
  profiles: Profile[];
  onEdit: (profile: Profile) => void;
  onPhotoChange?: () => void;
  currentSeason?: string;
  duesMap?: Record<string, SeasonalDue>;
  onToggleDues?: (profileId: string, paid: boolean) => void;
}

export const RosterTable: React.FC<RosterTableProps> = ({ profiles, onEdit, onPhotoChange, currentSeason, duesMap, onToggleDues }) => {
```

- [ ] **Step 3: Update `RosterTable.tsx` UI**

Add the "Dues Paid" column header conditionally.

```tsx
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Voice</th>
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Status</th>
            {currentSeason && (
              <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Dues Paid</th>
            )}
            <th className="text-label" style={{ padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Phone</th>
```

Add the "Dues Paid" table data cell conditionally.

```tsx
              <td style={{ padding: 'var(--space-md)' }}>
                <span className={`badge ${p.globalStatus.includes('Active') ? 'badge-rehearsal' : 'badge-performance'}`}>
                  {p.globalStatus}
                </span>
              </td>
              {currentSeason && (
                <td style={{ padding: 'var(--space-md)' }} onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={duesMap?.[p.id]?.paid || false}
                    onChange={(e) => onToggleDues?.(p.id, e.target.checked)}
                    style={{
                      cursor: 'pointer',
                      accentColor: 'var(--primary)',
                      width: '18px',
                      height: '18px'
                    }}
                  />
                </td>
              )}
              <td className="text-muted text-sm" style={{ padding: 'var(--space-md)' }}>{p.phone}</td>
```

And update the `colSpan` of the "No singers found" fallback:

```tsx
            <tr>
              <td colSpan={currentSeason ? 7 : 6} style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p className="text-muted text-sm">No singers found.</p>
              </td>
            </tr>
```

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/RosterView.tsx src/components/admin/RosterTable.tsx
git commit -m "feat(ui): integrate seasonal dues tracking into roster table"
```
