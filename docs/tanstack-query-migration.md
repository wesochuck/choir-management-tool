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

## Migration Status

| # | Target | Status |
|---|--------|--------|
| 1 | `src/hooks/useVenues.ts` | Done |
| 2 | `src/hooks/useVoiceParts.ts` | Done |
| 3 | `src/hooks/useDues.ts` | Done |
| 4 | `src/hooks/useEvents.ts` | Done |
| 5 | `src/hooks/useProfiles.ts` | Done |
| 6 | `src/hooks/useMyEvents.ts` | Done |
| 7 | `src/hooks/useSingerRsvpHistory.ts` | Done |
| 8 | `src/views/admin/ResourcesView.tsx` | Done |
| 9 | `src/views/admin/TicketingView.tsx` | Done |
| 10 | `src/hooks/useEventRosterData.ts` | Done |
| 11 | `src/hooks/useSeatingChart.ts` | Done |
| 12 | Dashboard views (after shared hooks) | Done |

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
