export const queryKeys = {
  choirSettings: {
    all: ['choirSettings'] as const,
  },
  appSettings: {
    all: ['appSettings'] as const,
    landing: ['appSettings', 'landing'] as const,
    roster: ['appSettings', 'roster'] as const,
    musicLibrary: ['appSettings', 'musicLibrary'] as const,
    heroImage: ['appSettings', 'heroImage'] as const,
  },
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
    publicList: ['events', 'publicList'] as const,
    publicById: (eventId: string) => [...queryKeys.events.all, 'publicById', eventId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
    active: () => [...queryKeys.profiles.all, 'active'] as const,
  },
  myEvents: {
    all: ['myEvents'] as const,
    list: () => [...queryKeys.myEvents.all, 'list'] as const,
  },
  myProfile: {
    all: ['myProfile'] as const,
    calendarFeed: () => [...queryKeys.myProfile.all, 'calendarFeed'] as const,
  },
  singerRsvps: {
    all: ['singerRsvps'] as const,
    bySingerId: (singerId: string) => [...queryKeys.singerRsvps.all, singerId] as const,
  },
  resources: {
    all: ['resources'] as const,
    list: () => [...queryKeys.resources.all, 'list'] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    forProfile: (profileId: string) => [...queryKeys.announcements.all, profileId] as const,
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
    publicBundle: (bundleId: string) => [...queryKeys.tickets.all, 'publicBundle', bundleId] as const,
    publicBundles: ['tickets', 'publicBundles'] as const,
    verify: (sessionId: string) => [...queryKeys.tickets.all, 'verify', sessionId] as const,
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
    active: ['polls', 'active'] as const,
    responses: ['polls', 'responses'] as const,
    settings: ['polls', 'settings'] as const,
    messages: ['polls', 'messages'] as const,
  },
  auditions: {
    all: ['auditions'] as const,
    list: ['auditions', 'list'] as const,
    settings: ['auditions', 'settings'] as const,
    performance: (eventId: string) => [...queryKeys.auditions.all, 'performance', eventId] as const,
  },
  users: {
    all: ['users'] as const,
    admins: ['users', 'admins'] as const,
  },
  seatingProfiles: {
    all: ['seatingProfiles'] as const,
    byEventAndChart: (eventId: string, chartId: string) =>
      [...queryKeys.seatingProfiles.all, eventId, chartId] as const,
  },
  musicLibrary: {
    all: ['musicLibrary'] as const,
    list: () => [...queryKeys.musicLibrary.all, 'list'] as const,
  },
  playlist: {
    all: ['playlist'] as const,
    byToken: (token: string) => [...queryKeys.playlist.all, token] as const,
    byEventId: (eventId: string) => [...queryKeys.playlist.all, 'event', eventId] as const,
  },
  donations: {
    all: ['donations'] as const,
    paid: ['donations', 'paid'] as const,
    settings: ['donations', 'settings'] as const,
    verify: (sessionId: string) => [...queryKeys.donations.all, 'verify', sessionId] as const,
  },
  purchases: {
    all: ['purchases'] as const,
    list: ['purchases', 'list'] as const,
    byProfile: (profileId: string) => [...queryKeys.purchases.all, 'profile', profileId] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    activeSingers: ['dashboard', 'activeSingers'] as const,
    upcomingEvents: ['dashboard', 'upcomingEvents'] as const,
    pendingAuditions: ['dashboard', 'pendingAuditions'] as const,
  },
  publicLanding: {
    all: ['publicLanding'] as const,
    settings: ['publicLanding', 'settings'] as const,
  },
  publicRsvp: {
    all: ['publicRsvp'] as const,
    details: (token: string) => [...queryKeys.publicRsvp.all, 'details', token] as const,
    timezone: () => [...queryKeys.publicRsvp.all, 'timezone'] as const,
  },
  publicPoll: {
    all: ['publicPoll'] as const,
    details: (token: string) => [...queryKeys.publicPoll.all, 'details', token] as const,
    timezone: () => [...queryKeys.publicPoll.all, 'timezone'] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    missCounts: (eventId: string) => [...queryKeys.attendance.all, 'missCounts', eventId] as const,
  },
  queueWebhookSettings: {
    all: ['queueWebhookSettings'] as const,
  },
  communications: {
    all: ['communications'] as const,
    history: () => [...queryKeys.communications.all, 'history'] as const,
    historyPaginated: (page: number, query: string) => [...queryKeys.communications.all, 'history', page, query] as const,
    drafts: () => [...queryKeys.communications.all, 'drafts'] as const,
    templates: () => [...queryKeys.communications.all, 'templates'] as const,
    settings: () => [...queryKeys.communications.all, 'settings'] as const,
    config: () => [...queryKeys.communications.all, 'config'] as const,
    choirName: () => [...queryKeys.communications.all, 'choirName'] as const,
    automatedTasks: () => [...queryKeys.communications.all, 'automatedTasks'] as const,
  },
} as const;
