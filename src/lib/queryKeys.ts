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
  tickets: {
    all: ['tickets'] as const,
    scanContext: (sessionId: string, purchaseId: string) => [...queryKeys.tickets.all, 'scanContext', sessionId, purchaseId] as const,
  },
} as const;
