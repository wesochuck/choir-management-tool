# TanStack Query Migration Guide

This app uses TanStack Query for server state and keeps React Router for routing.

## Rules

- Put shared keys in `src/lib/queryKeys.ts`.
- Use service functions as query and mutation functions.
- Preserve existing hook APIs during incremental migrations unless the calling view is updated in the same commit.
- Invalidate collection-level keys after create, update, and delete mutations.
- Keep form state in React component state; only server state belongs in Query.
- Do not use `Promise.all(items.map(...))` for unbounded PocketBase/network calls.
- Use `pb.filter(...)` for dynamic PocketBase filters.
- Do not introduce explicit `any` or `as any`.

## Migration Status (Full Sweep Completed 2026-06-16)

All views and hooks now use TanStack Query for server state. The full sweep included:

**Phase A — Critical anti-pattern fixes:**
- Moved queryFn side effects to useEffect in `useDocumentTitle.tsx` 
- Removed 6 state mirrors in `useCommunicationLibrary.ts` (data now read from query cache)
- Fixed duplicate cache key in `useEventSettings.ts` (communication settings under wrong key)
- Added `staleTime` defaults to all 15 hook-level queries
- Registered all inline query keys in central `queryKeys.ts`

**Phase B — Mutation migration (wrapped all writes in useMutation):**
- MusicLibraryView and MusicPieceModal (~25 write paths)
- Communication module (draft save, send, test, config save, SMTP test)
- SettingsView (7 parallel service calls in batch save + token generation)
- AuditionsView and PollsDashboardView
- SetListView and ResourcesView
- EventRosterView and PatronsView
- 4 public form submission views (Stripe redirects)
- Raw `pb.send()` calls (unsubscribe, quick-rsvp)

**Phase C — Polish:**
- Removed SettingsView `initial*` state (derived dirty-checking from query data)
- Removed PublicRsvpView state mirror (reads query data directly)
- Fixed PublicPlayerView IDB side effect in queryFn (moved to onSuccess)
- Added error handling to ChoirNameProvider, resolvedRecipientsQuery, seatingProfilesQuery
- Migrated useRosterConfigForm to useMutation
- Removed redundant state in useSeatingChart

## Query Key Pattern

```ts
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: () => [...queryKeys.venues.all, 'list'] as const,
  },
  voiceParts: {
    all: ['voiceParts'] as const,
    list: () => [...queryKeys.voiceParts.all, 'list'] as const,
  },
  dues: {
    all: ['dues'] as const,
    bySeason: (season: string) => [...queryKeys.dues.all, season] as const,
  },
  events: {
    all: ['events'] as const,
    list: () => [...queryKeys.events.all, 'list'] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
  },
  myEvents: {
    all: ['myEvents'] as const,
    list: () => [...queryKeys.myEvents.all, 'list'] as const,
  },
  singerRsvps: {
    all: ['singerRsvps'] as const,
    bySingerId: (singerId: string) => [...queryKeys.singerRsvps.all, singerId] as const,
  },
  resources: {
    all: ['resources'] as const,
    list: () => [...queryKeys.resources.all, 'list'] as const,
  },
  ticketing: {
    all: ['ticketing'] as const,
    main: (selectedEventId: string) => [...queryKeys.ticketing.all, 'main', selectedEventId] as const,
    logoUrl: ['ticketing', 'logoUrl'] as const,
  },
} as const;
```

## Hook Pattern

```ts
const query = useQuery({
  queryKey: queryKeys.venues.list(),
  queryFn: () => venueService.getVenues(),
});

const mutation = useMutation({
  mutationFn: (data: Partial<Venue>) => venueService.createVenue(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.venues.all }),
});
```
