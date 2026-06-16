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
  eventRoster: {
    all: ['eventRoster'] as const,
    byEventId: (eventId: string) => [...queryKeys.eventRoster.all, eventId] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    scanContext: (sessionId: string, purchaseId: string) => [...queryKeys.tickets.all, 'scanContext', sessionId, purchaseId] as const,
  },
  seating: {
    all: ['seating'] as const,
    data: (performanceId: string, venueId: string) => [...queryKeys.seating.all, 'data', performanceId, venueId] as const,
    settings: ['seating', 'settings'] as const,
  },
  reports: {
    all: ['reports'] as const,
    performances: ['reports', 'performances'] as const,
    concertSummary: (performanceId: string) => [...queryKeys.reports.all, 'concertSummary', performanceId] as const,
    musicLibrary: ['reports', 'musicLibrary'] as const,
  },
  polls: {
    all: ['polls'] as const,
    list: ['polls', 'list'] as const,
    responses: ['polls', 'responses'] as const,
    settings: ['polls', 'settings'] as const,
    messages: ['polls', 'messages'] as const,
  },
  auditions: {
    all: ['auditions'] as const,
    list: ['auditions', 'list'] as const,
    settings: ['auditions', 'settings'] as const,
  },
  users: {
    all: ['users'] as const,
    admins: ['users', 'admins'] as const,
  },
  donations: {
    all: ['donations'] as const,
    paid: ['donations', 'paid'] as const,
  },
  purchases: {
    all: ['purchases'] as const,
    list: ['purchases', 'list'] as const,
  },
} as const;
