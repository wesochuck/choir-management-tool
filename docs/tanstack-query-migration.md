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

## Migration Order

1. `src/hooks/useVenues.ts`
2. `src/hooks/useVoiceParts.ts`
3. `src/hooks/useDues.ts`
4. `src/hooks/useProfiles.ts`
5. `src/hooks/useSingerRsvpHistory.ts`
6. `src/views/admin/ResourcesView.tsx`
7. `src/views/admin/TicketingView.tsx`
8. `src/hooks/useEventRosterData.ts`
9. `src/hooks/useSeatingChart.ts`
10. Dashboard views after their shared hooks are migrated

## Query Key Pattern

```ts
export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: () => [...queryKeys.venues.all, 'list'] as const,
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
