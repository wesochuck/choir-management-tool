export const queryKeys = {
  venues: {
    all: ['venues'] as const,
    list: () => [...queryKeys.venues.all, 'list'] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    scanContext: (sessionId: string, purchaseId: string) => [...queryKeys.tickets.all, 'scanContext', sessionId, purchaseId] as const,
  },
} as const;
