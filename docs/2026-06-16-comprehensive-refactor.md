# Comprehensive Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute 8 refactoring items across 3 independent waves, cleaning up legacy patterns after TanStack Query and Web Awesome migrations.

**Architecture:** Three sequential waves (mechanical → behavioral → architecture), each independently verifiable. Wave 1 is auto-fixable formatting + targeted CSS class replacement. Wave 2 adds missing service methods and refactors views to use them. Wave 3 migrates remaining legacy components and parameterizes service auth.

**Tech Stack:** TypeScript ~6.0, React 19, TanStack Query 5, PocketBase SDK 0.26, Shoelace 2.20, Tailwind CSS 4, Prettier with `prettier-plugin-tailwindcss`, Vitest 4, ESLint 10.

---

## File Map

### Modified – Wave 1
| File | Change |
|------|--------|
| `src/views/PublicLandingView.tsx` | Remove unused `import pb from '../lib/pocketbase'` |
| `src/lib/queryKeys.ts` | Add `settings.roster` key |
| `src/hooks/useDues.ts` | Replace inline `['settings', 'roster']` with `queryKeys.settings.roster` |
| ~95 files in `src/` | Replace legacy CSS classes with components/Tailwind |

### Modified – Wave 2
| File | Change |
|------|--------|
| `src/services/ticketService.ts` | Add `getPublicBundles`, `getAllBundles`, `saveBundle`, `deleteBundle`, `hasPaidPurchasesForEvent` |
| `src/services/pollService.ts` | Add `getPolls`, `createPoll`, `deletePoll`, `getPollResponses` |
| `src/services/communicationService.ts` | Add `getSentPollMessages` |
| `src/services/musicLibraryService.ts` | Add `getMovements` |
| `src/services/rosterService.ts` | Add `getAcceptedRostersForEvent`, `getRostersForEvents`; parameterize `getMyRosters(userId)` |
| `src/services/profileService.ts` | Add `getAdminUsers`, `updateUserPreferences`, `ensureProfileForAdmin`; parameterize `getMyProfile(userId)` |
| `src/contexts/AuthContext.tsx` | Add `logout()` method to context and provider |
| `src/views/PublicTicketListView.tsx` | Use `ticketService.getPublicBundles` |
| `src/views/admin/AttendanceView.tsx` | Use `rosterService.getAcceptedRostersForEvent` / `getRostersForEvents` |
| `src/views/admin/TicketingView.tsx` | Use `ticketService` + `eventService` bundle methods |
| `src/views/admin/PollsDashboardView.tsx` | Use `pollService` + `communicationService` methods |
| `src/views/admin/MusicLibraryView.tsx` | Use `musicLibraryService.getMovements` |
| `src/views/admin/AuditionsView.tsx` | Use `profileService.getAdminUsers` |
| `src/views/admin/music-library/MusicPieceModal.tsx` | Use `musicLibraryService.getMovements` |
| `src/components/admin/EventModal.tsx` | Use `ticketService.hasPaidPurchasesForEvent` |
| `src/components/admin/PollSelectionModal.tsx` | Use `pollService` methods |
| `src/views/singer/ProfileView.tsx` | Replace `pb.authStore.*` + `pb.collection()` calls with `useAuth()` + service methods |
| `src/components/admin/SingerModal.tsx` | Replace `pb.authStore.model` with `useAuth().user` |
| `src/views/singer/DashboardView.tsx` | Replace `pb.authStore.clear()` with `logout()` from `useAuth()` |
| `src/views/admin/AdminDashboardView.tsx` | Replace `pb.authStore.clear()` with `logout()` from `useAuth()` |
| `src/components/common/PageLayout.tsx` | Replace `pb.authStore.clear()` with `logout()` from `useAuth()` |
| `src/hooks/useDues.ts` | Use parameterized `getMyRosters(userId)` |
| `src/hooks/useMyRosters.ts` (exists? check) | Use parameterized `getMyRosters(userId)` |
| `src/hooks/useMyProfile.ts` (or inline hook) | Use parameterized `getMyProfile(userId)` |

### Modified – Wave 3
| File | Change |
|------|--------|
| Various consumers of `Pagination`, `PhotoUploader`, `MarkdownEditor` | Switch imports from `common/` to `ui/` |
| Consumer hooks of `getMyRosters()`, `getMyProfile()` | Pass `user.id` parameter |

---

## Wave 1: Mechanical Cleanup

### Task 1.1: Remove dead import in PublicLandingView

**Files:**
- Modify: `src/views/PublicLandingView.tsx`

- [ ] **Step 1: Remove the unused import**

In `src/views/PublicLandingView.tsx`, find the line:
```ts
import pb from '../lib/pocketbase';
```
And remove it (it is unused — all data fetches use `settingsService` and `eventService`).

- [ ] **Step 2: Verify lint**

Run:
```bash
rtk npx eslint src/views/PublicLandingView.tsx
```
Expected: no `no-unused-vars` error for `pb`.

---

### Task 1.2: Add missing `settings.roster` query key

**Files:**
- Modify: `src/lib/queryKeys.ts`
- Modify: `src/hooks/useDues.ts`

- [ ] **Step 1: Read `queryKeys.ts` to find the `settings` namespace**

Read `src/lib/queryKeys.ts` and locate the `settings` section.

- [ ] **Step 2: Add the `roster` key**

Add inside the `settings` namespace:
```ts
roster: ['settings', 'roster'] as const,
```

- [ ] **Step 3: Read `useDues.ts` to find the inline key**

Read `src/hooks/useDues.ts` and find usage of `['settings', 'roster']` as a query key.

- [ ] **Step 4: Replace inline key**

Replace:
```ts
queryKey: ['settings', 'roster'] as const,
```
With:
```ts
queryKey: queryKeys.settings.roster,
```

- [ ] **Step 5: Verify**

```bash
rtk npx eslint src/hooks/useDues.ts src/lib/queryKeys.ts
rtk npx vitest run src/hooks/useDues.test.ts
```

---

### Task 1.3: Auto-fix Tailwind class ordering

**Files:**
- All files under `src/`

- [ ] **Step 1: Run Prettier with Tailwind plugin**

```bash
rtk npx prettier --write src/
```

- [ ] **Step 2: Verify warning count dropped**

```bash
rtk npx eslint src/ 2>&1 | grep "tailwindcss/classnames-order" | wc -l
```
Expected: count substantially lower (close to 0).

---

### Task 1.4a: Replace button legacy classes (~600 instances)

**Files:**
- All files in `src/` containing `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-sm`, `btn-link` classes

Approach: For each HTML `<button>` or `<a>` with legacy `btn-*` classes, replace with the `<Button>` or `<Button as={Link}>` wrapper from `src/components/ui/Button/Button.tsx`.

- [ ] **Step 1: Map legacy classes to Button props**

| Legacy Class | Button Props |
|---|---|
| `btn btn-primary` | `variant="primary"` |
| `btn btn-secondary` | `variant="neutral"` |
| `btn btn-danger` | `variant="danger"` |
| `btn btn-link` | `variant="text"` (or `variant="neutral"` + `noOutline`) |
| `btn btn-ghost` | `variant="neutral"` + check for outline behavior |
| `btn btn-sm` | `size="sm"` |
| `btn` (default) | `variant="neutral"` |

- [ ] **Step 2: Find all files with button classes**

```bash
rg -l 'className="[^"]*btn' src/ --include '*.tsx'
```

- [ ] **Step 3-7: Process files in batches**

For each batch of ~15 files, replace patterns. Example transformation:

```tsx
// Before
<button className="btn btn-primary" onClick={handleSave}>Save</button>
// After
<Button variant="primary" onClick={handleSave}>Save</Button>
```

For links as buttons:
```tsx
// Before
<a className="btn btn-secondary" href="/events">View Events</a>
// After
<Button as={Link} variant="neutral" to="/events">View Events</Button>
```

- [ ] **Step N: Run ESLint after each batch**

```bash
rtk npx eslint src/ 2>&1 | grep "no-custom-classname" | grep -c "btn"
```
Expected: count decreases with each batch.

---

### Task 1.4b: Replace typography legacy classes (~400 instances)

**Files:**
- All files in `src/` containing `text-label`, `text-body`, `text-headline`, `text-muted`

- [ ] **Step 1: Map legacy classes to Tailwind**

| Legacy Class | Tailwind Equivalent |
|---|---|
| `text-label` | `text-sm font-medium text-gray-700` (or `text-muted-foreground`) |
| `text-body` | `text-base text-gray-900` |
| `text-headline` | `text-lg font-semibold text-gray-900` |
| `text-muted` | `text-sm text-gray-500` |

- [ ] **Step 2: Find all files**

```bash
rg -l 'text-label|text-body|text-headline|text-muted' src/ --include '*.tsx'
```

- [ ] **Step 3-7: Replace in batches**

Example:
```tsx
// Before
<span className="text-label">Name</span>
// After
<span className="text-sm font-medium text-gray-700">Name</span>
```

- [ ] **Step N: Verify**

```bash
rtk npx eslint src/ 2>&1 | grep "no-custom-classname" | grep -c "text-"
```

---

### Task 1.4c: Replace layout/other legacy classes (~400 instances)

**Files:**
- All files in `src/` containing `card`, `border-error`, `border-warning`, `lucide-icon`, etc.

- [ ] **Step 1: Map**

| Legacy Class | Tailwind Equivalent |
|---|---|
| `card` | `rounded-lg border bg-card p-4 shadow-sm` or `<AppCard>` wrapper |
| `border-error` | `border-red-500` |
| `border-warning` | `border-yellow-500` |
| `lucide-icon` | `inline-block` (Lucide icons don't need custom class) |
| `app-loading-container` | `flex items-center justify-center min-h-[200px]` |
| `composer-*` | Tailwind equivalents in `ComposeStep.tsx` |
| `live-preview-*` | Tailwind equivalents in `LivePreview.tsx` |

- [ ] **Step 2-N: Replace in batches**

Example:
```tsx
// Before
<div className="card">
// After
<div className="rounded-lg border bg-card p-4 shadow-sm">
```

- [ ] **Step N: Verify**

```bash
rtk npx eslint src/ 2>&1 | grep "no-custom-classname" | wc -l
```
Expected: count significantly reduced (from ~1472 to near 0 for common patterns; some domain-specific classes like `composer-*` may need to remain in `ComposeStep.tsx`).

---

### Task 1.5: Fix Tailwind shorthand (~16 instances)

- [ ] **Step 1: Find shorthand opportunities**

```bash
rg 'w-4 h-4' src/ --include '*.tsx'
```

- [ ] **Step 2: Replace with `size-4`**

For each occurrence, replace `w-4 h-4` with `size-4`. Similar for `w-5 h-5` → `size-5`, `w-6 h-6` → `size-6`.

- [ ] **Step 3: Verify**

```bash
rtk npx eslint src/ 2>&1 | grep "enforces-shorthand" | wc -l
```
Expected: close to 0.

---

### Wave 1 Checkpoint

- [ ] **Run full verification**

```bash
rtk npx eslint src/
rtk npx tsc --noEmit
rtk npx vitest run
```
Expected: zero errors, all tests pass.

---

## Wave 2: Behavioral Refactors

### Task 2.1: Add ticket bundle methods to `ticketService.ts`

**Files:**
- Modify: `src/services/ticketService.ts`

- [ ] **Step 1: Read current `ticketService.ts`**

Read the file to understand existing patterns (error handling, filter usage, return types).

- [ ] **Step 2: Add bundle methods**

```ts
export const getPublicBundles = async (): Promise<TicketBundle[]> => {
  return pb.collection('ticketBundles').getFullList<TicketBundle>({
    filter: 'isActive = true && saleEndDate >= @now',
    sort: 'saleEndDate',
    expand: 'events',
  });
};

export const getAllBundles = async (): Promise<TicketBundle[]> => {
  return pb.collection('ticketBundles').getFullList<TicketBundle>({
    sort: '-created',
    expand: 'events',
  });
};

export const saveBundle = async (
  data: Partial<TicketBundle> & { id?: string },
): Promise<TicketBundle> => {
  const { id, ...rest } = data;
  if (id) {
    return pb.collection('ticketBundles').update<TicketBundle>(id, rest);
  }
  return pb.collection('ticketBundles').create<TicketBundle>(rest);
};

export const deleteBundle = async (bundleId: string): Promise<void> => {
  await pb.collection('ticketBundles').delete(bundleId);
};

export const hasPaidPurchasesForEvent = async (
  eventId: string,
): Promise<boolean> => {
  try {
    await pb.collection('ticketPurchases').getFirstListItem(
      pb.filter('event = {:eventId} && status = "paid"', { eventId }),
    );
    return true;
  } catch {
    return false;
  }
};
```

- [ ] **Step 3: Verify types compile**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.2: Add admin poll methods to `pollService.ts`

**Files:**
- Modify: `src/services/pollService.ts`

- [ ] **Step 1: Read current `pollService.ts`**

Understand pattern and existing methods.

- [ ] **Step 2: Add admin methods**

```ts
export const getPolls = async (): Promise<PollRecord[]> => {
  return pb.collection('polls').getFullList<PollRecord>({ sort: '-created' });
};

export const createPoll = async (
  data: { question: string; archiveAt: string; eventId?: string },
): Promise<PollRecord> => {
  return pb.collection('polls').create<PollRecord>(data);
};

export const deletePoll = async (pollId: string): Promise<void> => {
  await pb.collection('polls').delete(pollId);
};

export const getPollResponses = async (): Promise<PollResponseRecord[]> => {
  return pb.collection('pollResponses').getFullList<PollResponseRecord>({
    expand: 'profileId',
    sort: '-updated',
  });
};
```

- [ ] **Step 3: Verify types compile**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.3: Add `getSentPollMessages` to `communicationService.ts`

**Files:**
- Modify: `src/services/communicationService.ts`

- [ ] **Step 1: Read current file to find the messages collection pattern**

- [ ] **Step 2: Add method**

```ts
export const getSentPollMessages = async (): Promise<MessageRecord[]> => {
  return pb.collection('messages').getFullList<MessageRecord>({
    filter: 'status = "Sent" && content ~ "{{POLL_LINK:"',
  });
};
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.4: Add `getMovements` to `musicLibraryService.ts`

**Files:**
- Modify: `src/services/musicLibraryService.ts`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Add method**

```ts
export const getMovements = async (
  parentId: string,
): Promise<MusicPiece[]> => {
  return pb.collection('musicLibrary').getFullList<MusicPiece>({
    filter: pb.filter('parentId = {:parentId}', { parentId }),
    sort: 'created',
  });
};
```

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.5: Add bulk roster methods to `rosterService.ts`

**Files:**
- Modify: `src/services/rosterService.ts`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Add methods**

```ts
export const getAcceptedRostersForEvent = async (
  eventId: string,
): Promise<EventRoster[]> => {
  return pb.collection('eventRosters').getFullList<EventRoster>({
    filter: pb.filter('event = {:eventId} && rsvp = "Yes"', { eventId }),
  });
};

export const getRostersForEvents = async (
  eventIds: string[],
): Promise<EventRoster[]> => {
  const filterStr = eventIds
    .map((_, i) => `event = {:eventId${i}}`)
    .join(' || ');
  const params = Object.fromEntries(
    eventIds.map((id, i) => [`eventId${i}`, id]),
  );
  return pb.collection('eventRosters').getFullList<EventRoster>({
    filter: pb.filter(filterStr, params),
  });
};
```

- [ ] **Step 3: Parameterize `getMyRosters`**

Change signature from:
```ts
export const getMyRosters = async (options?: ...): Promise<...> => {
```
To:
```ts
export const getMyRosters = async (
  userId: string,
  options?: ...,
): Promise<...> => {
```
Replace internal `pb.authStore.model?.id` with `userId` parameter.

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.6: Add admin/profile methods to `profileService.ts`

**Files:**
- Modify: `src/services/profileService.ts`

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Add methods**

```ts
export const getAdminUsers = async (): Promise<UserAccount[]> => {
  return pb.collection('users').getFullList<UserAccount>({
    filter: 'role = "admin"',
  });
};

export const updateUserPreferences = async (
  userId: string,
  preferences: UserPreferences,
): Promise<ChoirUser> => {
  return pb.collection('users').update<ChoirUser>(userId, { preferences });
};
```

- [ ] **Step 3: Parameterize `getMyProfile`**

Change from:
```ts
export const getMyProfile = async (): Promise<...> => {
  const userId = pb.authStore.model?.id;
  ...
```
To:
```ts
export const getMyProfile = async (userId: string): Promise<...> => {
  ...
```

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.7: Add `ensureProfileForAdmin` to `profileService.ts`

This combines the `users.update` + `profiles.update`/`create` pattern from `ProfileView.tsx` into one service method.

- [ ] **Step 1: Add the method**

```ts
export const ensureProfileForAdmin = async (
  userId: string,
  profileId: string | null,
  data: {
    name: string;
    email: string;
    receiveAttendanceReports: boolean;
    receiveRsvpDeclineNotices: boolean;
    receiveAdminNotifications: boolean;
    phone?: string;
  },
): Promise<void> => {
  await pb.collection('users').update(userId, { name: data.name, email: data.email });

  const profileData = {
    name: data.name,
    receiveAttendanceReports: data.receiveAttendanceReports,
    receiveRsvpDeclineNotices: data.receiveRsvpDeclineNotices,
    receiveAdminNotifications: data.receiveAdminNotifications,
    phone: data.phone,
  };

  if (profileId) {
    await pb.collection('profiles').update(profileId, profileData);
  } else {
    await pb.collection('profiles').create({
      user: userId,
      ...profileData,
      voicePart: '',
      globalStatus: 'Active',
    });
  }
};
```

- [ ] **Step 2: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.8: Refactor views to use service methods

For each of the ~12 views that call `pb.collection()` directly, replace the raw calls with the new service methods.

**Files (in order):**
1. `src/views/PublicTicketListView.tsx` — replace `pb.collection('ticketBundles').getFullList(...)` with `ticketService.getPublicBundles()`
2. `src/views/admin/AttendanceView.tsx` — replace `pb.collection('eventRosters').getFullList(...)` with `rosterService.getAcceptedRostersForEvent()` / `getRostersForEvents()`
3. `src/views/admin/TicketingView.tsx` — replace `pb.collection('events').getFullList(...)` with `eventService.getTicketingEnabledEvents()`; replace `pb.collection('ticketBundles')` calls with `ticketService` methods
4. `src/views/admin/PollsDashboardView.tsx` — replace `pb.collection('polls')`, `pollResponses`, `messages` with service methods
5. `src/views/admin/MusicLibraryView.tsx` — replace `pb.collection('musicLibrary').getFullList(...)` with `musicLibraryService.getMovements()`
6. `src/views/admin/AuditionsView.tsx` — replace `pb.collection('users').getFullList(...)` with `profileService.getAdminUsers()`
7. `src/views/admin/music-library/MusicPieceModal.tsx` — replace `pb.collection('musicLibrary').getFullList(...)` with `musicLibraryService.getMovements()`
8. `src/components/admin/EventModal.tsx` — replace `pb.collection('ticketPurchases').getFirstListItem(...)` with `ticketService.hasPaidPurchasesForEvent()`
9. `src/components/admin/PollSelectionModal.tsx` — replace `pb.collection('polls')` calls with `pollService` methods
10. `src/views/singer/ProfileView.tsx` — replace ALL `pb.collection()` calls and `pb.authStore.*` reads with service methods + `useAuth()`

- [ ] **Step 1-N: Refactor each view**

For each file, the pattern is:
1. Remove `import pb from '../../lib/pocketbase'` (or adjust path)
2. Add the service import
3. Replace inline `pb.collection('X')` with `service.method()` inside `queryFn`/`mutationFn`

Example (PublicTicketListView.tsx):
```tsx
// Before
import pb from '../lib/pocketbase';
// ...
const bundlesQuery = useQuery({
  queryKey: queryKeys.ticketing.publicBundles(),
  queryFn: () => pb.collection('ticketBundles').getFullList<TicketBundle>({
    filter: 'isActive = true && saleEndDate >= @now',
    sort: 'saleEndDate',
    expand: 'events',
  }),
});

// After
import { getPublicBundles } from '../services/ticketService';
// ...
const bundlesQuery = useQuery({
  queryKey: queryKeys.ticketing.publicBundles(),
  queryFn: getPublicBundles,
});
```

- [ ] **Step N: Full verification**

```bash
rtk npx tsc --noEmit
rtk npx vitest run
```

---

### Task 2.9: Extend AuthContext with `logout()`

**Files:**
- Modify: `src/contexts/AuthContext.tsx`

- [ ] **Step 1: Read `AuthContext.tsx`**

- [ ] **Step 2: Add `logout` to the interface**

```ts
interface AuthContextType {
  user: ChoirUser | null;
  isLoading: boolean;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  logout: () => void;
}
```

- [ ] **Step 3: Add `logout` to the provider**

Inside `AuthProvider`, add:
```ts
const logout = useCallback(() => {
  pb.authStore.clear();
  navigate('/login');
}, [navigate]);
```

- [ ] **Step 4: Pass `logout` in context value**

```ts
const value = useMemo(
  () => ({ user, isLoading, updatePreferences, logout }),
  [user, isLoading, updatePreferences, logout],
);
```

- [ ] **Step 5: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.10: Replace `pb.authStore.record`/`.model` with `useAuth().user`

**Files:**
- `src/views/singer/ProfileView.tsx` — 7 accesses
- `src/components/admin/SingerModal.tsx` — 2 accesses

- [ ] **Step 1: ProfileView.tsx — replace all `pb.authStore.record`**

This file already imports `useAuth()`. Add `user` from the destructured return value:

```tsx
const { user } = useAuth();
```

Then replace every:
- `pb.authStore.record.id` → `user?.id`
- `pb.authStore.record.role` → `user?.role`
- `pb.authStore.record.email` → `user?.email`
- `pb.authStore.record.name` → `user?.name`

Also replace the service call patterns from Task 2.8 (line 161):
```tsx
// Before
pb.collection('users').update(pb.authStore.record.id, { email })
// After (moved into profileService.ensureProfileForAdmin or separate call)
profileService.updateUser(user.id, { email });
```

- [ ] **Step 2: SingerModal.tsx — replace `pb.authStore.model`**

Add `useAuth()` import and destructure `user`:
```tsx
import { useAuth } from '../../contexts/AuthContext';
// ...
const { user } = useAuth();
```

Replace:
```tsx
// Before
const isSelf = pb.authStore.model?.id === profileId;
const isAdmin = pb.authStore.model?.role === 'admin';

// After
const isSelf = user?.id === profileId;
const isAdmin = (user as ChoirUser)?.role === 'admin';
```

Note: `role` may not be in the `ChoirUser` type. Add it or use a type assertion.

- [ ] **Step 3: Update `ChoirUser` type if needed**

If `ChoirUser` in `src/types/auth.ts` is missing `role`, add it:
```ts
export interface ChoirUser extends RecordModel {
  email: string;
  name: string;
  role?: 'admin' | 'singer';
  preferences: UserPreferences;
}
```

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.11: Replace `pb.authStore.clear()` with `logout()` from `useAuth()`

**Files:**
- `src/views/singer/DashboardView.tsx`
- `src/views/admin/AdminDashboardView.tsx`
- `src/components/common/PageLayout.tsx`

- [ ] **Step 1: Read each file, find `pb.authStore.clear()`**

- [ ] **Step 2: Replace each occurrence**

```tsx
// Before
pb.authStore.clear();
navigate('/login');

// After
logout();
```

These files already import `useAuth()` in most cases (e.g., `AdminDashboardView.tsx` and `PageLayout.tsx` use it for `user`). If not present, add the destructured `logout`:
```tsx
const { logout } = useAuth();
```

- [ ] **Step 3: Remove `import pb from '../lib/pocketbase'`** if now unused

- [ ] **Step 4: Verify**

```bash
rtk npx tsc --noEmit
```

---

### Task 2.12: Update callers of parameterized service methods

**Files:**
- Hook files that call `getMyRosters()` and `getMyProfile()`

- [ ] **Step 1: Find all callers**

```bash
rg "getMyRosters\(" src/ --include '*.ts'
rg "getMyProfile\(" src/ --include '*.ts'
```

- [ ] **Step 2: Update each caller to pass `user.id`**

```tsx
// Before
const { data: myRosters } = useQuery({
  queryKey: queryKeys.singerRsvp.myRosters(),
  queryFn: () => rosterService.getMyRosters(),
});

// After
const { user } = useAuth();
const { data: myRosters } = useQuery({
  queryKey: queryKeys.singerRsvp.myRosters(),
  queryFn: () => rosterService.getMyRosters(user?.id ?? ''),
});
```

Important: guard against `user?.id` being `undefined` by using nullish coalescing (`?? ''`) or early return. PocketBase will return empty results for an invalid ID, which is safe.

- [ ] **Step 3: Verify**

```bash
rtk npx tsc --noEmit
rtk npx vitest run
```

---

### Wave 2 Checkpoint

- [ ] **Full verification**

```bash
rtk npx eslint src/
rtk npx tsc --noEmit
rtk npx vitest run
```

---

## Wave 3: Architecture Improvements

### Task 3.1: Audit legacy common component usage

**Files:**
- `src/components/common/` (8 components)

- [ ] **Step 1: Find all imports of legacy components**

```bash
rg "from '\.\./components/common/" src/ --include '*.tsx' --include '*.ts'
rg "from '\.\./\.\./components/common/" src/ --include '*.tsx' --include '*.ts'
rg "from '../../components/common/" src/ --include '*.tsx' --include '*.ts'
rg "'common/" src/ --include '*.tsx' --include '*.ts'
```

- [ ] **Step 2: Compare API surface of each legacy vs UI replacement**

For each component pair (Pagination, PhotoUploader, MarkdownEditor), check:
- Props: same names? same types?
- Behavior: same edge cases?
- Return type: same render pattern?

Record findings for decision.

---

### Task 3.2: Migrate components with API parity

For components where APIs match exactly, switch imports.

- [ ] **Step 1-N: Replace imports per component**

```tsx
// Before
import Pagination from '../components/common/Pagination';
// After
import Pagination from '../components/ui/Pagination';
```

- [ ] **Step 2-N: Verify each migration**

```bash
rtk npx tsc --noEmit
rtk npx vitest run
```

---

### Task 3.3: Handle components without exact API parity

- [ ] **Step 1: Report findings**

Document which components can and cannot be migrated, with rationale. Leave non-matching components as-is in `common/`.

---

### Wave 3 Checkpoint

- [ ] **Full verification**

```bash
rtk npx eslint src/
rtk npx tsc --noEmit
rtk npx vitest run
```

---

## Final Verification

- [ ] **Run all checks**

```bash
rtk npx eslint src/
rtk npx tsc --noEmit
rtk npx vitest run
```
