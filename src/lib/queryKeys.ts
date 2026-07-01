export const queryKeys = {
  choirSettings: {
    all: ['choirSettings'] as const,
    admin: ['choirSettings', 'admin'] as const,
  },
  appSettings: {
    all: ['appSettings'] as const,
    landing: ['appSettings', 'landing'] as const,
    roster: ['appSettings', 'roster'] as const,
    musicLibrary: ['appSettings', 'musicLibrary'] as const,
    heroImage: ['appSettings', 'heroImage'] as const,
    directory: ['appSettings', 'directorySettings'] as const,
    performerLabel: ['appSettings', 'performer_label'] as const,
    emailProvider: ['appSettings', 'email_provider'] as const,
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
    publicTicketedList: ['events', 'publicTicketedList'] as const,
    recentPublicPerformances: (limit: number) =>
      [...queryKeys.events.all, 'recentPublicPerformances', limit] as const,
    pastPerformancesList: (page: number) =>
      [...queryKeys.events.all, 'pastPerformances', page] as const,
    publicById: (eventId: string) => [...queryKeys.events.all, 'publicById', eventId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    list: () => [...queryKeys.profiles.all, 'list'] as const,
    active: () => [...queryKeys.profiles.all, 'active'] as const,
    directory: () => [...queryKeys.profiles.all, 'directory'] as const,
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
    main: (selectedEventId: string) =>
      [...queryKeys.ticketing.all, 'main', selectedEventId] as const,
    events: () => [...queryKeys.ticketing.all, 'events'] as const,
    missingEvents: (eventIds: string[]) =>
      [...queryKeys.ticketing.all, 'events', 'missing', ...eventIds] as const,
    purchasesByEvent: (eventId: string) =>
      [...queryKeys.ticketing.all, 'purchases', 'event', eventId] as const,
    allPurchases: () => [...queryKeys.ticketing.all, 'purchases', 'all'] as const,
    bundles: () => [...queryKeys.ticketing.all, 'bundles'] as const,
    timezone: () => [...queryKeys.ticketing.all, 'timezone'] as const,
    logoUrl: ['ticketing', 'logoUrl'] as const,
    confirmationPage: () => [...queryKeys.ticketing.all, 'confirmationPage'] as const,
  },
  eventRoster: {
    all: ['eventRoster'] as const,

    // Raw EventRoster[] records
    recordsByEventId: (eventId: string) =>
      [...queryKeys.eventRoster.all, 'records', eventId] as const,

    // Composite EventRosterQueryData page data
    dataByEventId: (eventId: string) => [...queryKeys.eventRoster.all, 'data', eventId] as const,

    // All-event roster stats batch
    recordsForEvents: (eventIds: string[]) =>
      [...queryKeys.eventRoster.all, 'recordsForEvents', ...eventIds] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    scanContext: (sessionId: string, purchaseId: string) =>
      [...queryKeys.tickets.all, 'scanContext', sessionId, purchaseId] as const,
    publicBundle: (bundleId: string) =>
      [...queryKeys.tickets.all, 'publicBundle', bundleId] as const,
    publicBundles: ['tickets', 'publicBundles'] as const,
    verify: (sessionId: string) => [...queryKeys.tickets.all, 'verify', sessionId] as const,
  },
  seating: {
    all: ['seating'] as const,
    data: (performanceId: string, venueId: string) =>
      [...queryKeys.seating.all, 'data', performanceId, venueId] as const,
    settings: ['seating', 'settings'] as const,
  },
  settings: {
    roster: ['settings', 'roster'] as const,
  },
  reports: {
    all: ['reports'] as const,
    performances: ['reports', 'performances'] as const,
    concertSummary: (performanceId: string) =>
      [...queryKeys.reports.all, 'concertSummary', performanceId] as const,
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
    movements: (parentId: string) =>
      [...queryKeys.musicLibrary.all, 'movements', parentId] as const,
  },
  playlist: {
    all: ['playlist'] as const,
    byToken: (token: string) => [...queryKeys.playlist.all, token] as const,
    byEventId: (eventId: string) => [...queryKeys.playlist.all, 'event', eventId] as const,
    bySingerEventId: (eventId: string) =>
      [...queryKeys.playlist.all, 'singer-event', eventId] as const,
    availability: (eventId: string) =>
      [...queryKeys.playlist.all, 'availability', eventId] as const,
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
    timezone: ['publicLanding', 'timezone'] as const,
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
    historyPaginated: (page: number, query: string) =>
      [...queryKeys.communications.all, 'history', page, query] as const,
    drafts: () => [...queryKeys.communications.all, 'drafts'] as const,
    templates: () => [...queryKeys.communications.all, 'templates'] as const,
    settings: () => [...queryKeys.communications.all, 'settings'] as const,
    config: () => [...queryKeys.communications.all, 'config'] as const,
    choirName: () => [...queryKeys.communications.all, 'choirName'] as const,
    automatedTasks: () => [...queryKeys.communications.all, 'automatedTasks'] as const,
    resolvedRecipients: (filters: unknown) =>
      [...queryKeys.communications.all, 'resolvedRecipients', filters] as const,
  },
} as const;
