export const MODULE_IDS = [
  'roster',
  'events',
  'attendance',
  'rsvps',
  'musicLibrary',
  'setLists',
  'resources',
  'reports',
  'publicWebsite',
  'directory',
  'auditions',
  'communications',
  'polls',
  'seating',
  'ticketSales',
  'donations',
  'patrons',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleDefinition {
  id: ModuleId;
  label: string;
  description: string;
  requiresAll?: ModuleId[];
  requiresAny?: ModuleId[];
  dashboardRoutes?: string[];
  publicRoutes?: string[];
}

export const RECOMMENDED_MODULES: readonly ModuleId[] = [
  'roster',
  'events',
  'musicLibrary',
  'setLists',
] as const;

export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
  roster: {
    id: 'roster',
    label: 'Roster',
    description: 'Manage members, sections, voice parts, and contacts.',
    dashboardRoutes: ['/admin/roster'],
  },
  events: {
    id: 'events',
    label: 'Events & Venues',
    description: 'Schedule rehearsals, concerts, and manage venue locations.',
    dashboardRoutes: ['/admin/events', '/admin/venues'],
  },
  attendance: {
    id: 'attendance',
    label: 'Attendance',
    description: 'Track member attendance for scheduled events.',
    requiresAll: ['events', 'roster'],
    dashboardRoutes: ['/admin/attendance'],
  },
  rsvps: {
    id: 'rsvps',
    label: 'RSVPs',
    description: 'Collect event availability and track singer response rates.',
    requiresAll: ['events', 'roster'],
    dashboardRoutes: ['/admin/rsvp'],
    publicRoutes: ['/rsvp', '/unsubscribe'],
  },
  musicLibrary: {
    id: 'musicLibrary',
    label: 'Music Library',
    description: 'Catalog sheet music, assign parts, and attach audio tracks.',
    dashboardRoutes: ['/admin/library'],
    publicRoutes: ['/player'],
  },
  setLists: {
    id: 'setLists',
    label: 'Set Lists',
    description: 'Build set lists from the music library for concerts.',
    requiresAll: ['musicLibrary', 'events'],
    dashboardRoutes: ['/admin/setlists'],
  },
  resources: {
    id: 'resources',
    label: 'Resources',
    description: 'Share documents, recordings, and files with singers.',
    requiresAll: ['roster'],
    dashboardRoutes: ['/admin/resources'],
  },
  reports: {
    id: 'reports',
    label: 'Reports',
    description: 'Generate roster, event, and attendance summaries.',
    requiresAll: ['roster', 'events'],
    dashboardRoutes: ['/admin/reports'],
  },
  publicWebsite: {
    id: 'publicWebsite',
    label: 'Public Website',
    description: 'Publish public homepage, performance history, and past events.',
    publicRoutes: ['/', '/history', '/performances'],
    dashboardRoutes: ['/admin/website'],
  },
  directory: {
    id: 'directory',
    label: 'Member Directory',
    description: 'Allow singers to view contact details for active members.',
    requiresAll: ['roster'],
    dashboardRoutes: ['/directory'],
  },
  auditions: {
    id: 'auditions',
    label: 'Auditions',
    description: 'Manage audition schedules and public singer applications.',
    requiresAll: ['roster'],
    dashboardRoutes: ['/admin/auditions'],
    publicRoutes: ['/auditions'],
  },
  communications: {
    id: 'communications',
    label: 'Communications',
    description: 'Send bulk emails and text notifications to members.',
    requiresAll: ['roster'],
    dashboardRoutes: ['/admin/communications'],
  },
  polls: {
    id: 'polls',
    label: 'Engagement Polls',
    description: 'Send polls and surveys to gather performer feedback.',
    requiresAll: ['communications'],
    dashboardRoutes: ['/admin/polls'],
    publicRoutes: ['/poll'],
  },
  seating: {
    id: 'seating',
    label: 'Seating Charts',
    description: 'Assign performers to seating charts for events.',
    requiresAll: ['events', 'roster'],
    dashboardRoutes: ['/admin/seating', '/seating/:eventId'],
  },
  ticketSales: {
    id: 'ticketSales',
    label: 'Ticket Sales',
    description: 'Sell event tickets online and scan them at the door.',
    requiresAll: ['events'],
    dashboardRoutes: ['/admin/tickets', '/admin/tickets/scan'],
    publicRoutes: [
      '/tickets',
      '/tickets/order/success',
      '/tickets/bundle/:bundleId',
      '/tickets/:eventId',
    ],
  },
  donations: {
    id: 'donations',
    label: 'Donations',
    description: 'Collect donations and contributions from patrons.',
    dashboardRoutes: ['/admin/donations'],
    publicRoutes: ['/donate', '/donate/success'],
  },
  patrons: {
    id: 'patrons',
    label: 'Patrons',
    description: 'Manage donors, ticket buyers, and sponsor records.',
    requiresAny: ['ticketSales', 'donations'],
    dashboardRoutes: ['/admin/patrons'],
  },
};

const routeToModuleMap: { [prefix: string]: ModuleId } = {
  '/admin/roster': 'roster',
  '/admin/events': 'events',
  '/admin/venues': 'events',
  '/admin/attendance': 'attendance',
  '/admin/rsvp': 'rsvps',
  '/rsvp': 'rsvps',
  '/unsubscribe': 'rsvps',
  '/admin/library': 'musicLibrary',
  '/player': 'musicLibrary',
  '/admin/setlists': 'setLists',
  '/admin/resources': 'resources',
  '/admin/reports': 'reports',
  '/admin/website': 'publicWebsite',
  '/history': 'publicWebsite',
  '/performances': 'publicWebsite',
  '/directory': 'directory',
  '/admin/auditions': 'auditions',
  '/auditions': 'auditions',
  '/admin/communications': 'communications',
  '/admin/polls': 'polls',
  '/poll': 'polls',
  '/admin/seating': 'seating',
  '/seating/': 'seating',
  '/admin/tickets': 'ticketSales',
  '/tickets': 'ticketSales',
  '/admin/donations': 'donations',
  '/donate': 'donations',
  '/admin/patrons': 'patrons',
};

export function getModuleForRoute(routePath: string): ModuleId | undefined {
  if (routePath === '/') return 'publicWebsite';

  // Exact match check first
  for (const prefix of Object.keys(routeToModuleMap)) {
    if (routePath === prefix) return routeToModuleMap[prefix];
  }

  // Prefix check next
  for (const prefix of Object.keys(routeToModuleMap)) {
    if (prefix !== '/' && routePath.startsWith(prefix)) {
      return routeToModuleMap[prefix];
    }
  }
  return undefined;
}

export function isModuleRoute(routePath: string): boolean {
  return getModuleForRoute(routePath) !== undefined;
}

export function enableModule(enabledSet: Set<ModuleId>, moduleId: ModuleId): Set<ModuleId> {
  const result = new Set(enabledSet);
  const queue: ModuleId[] = [moduleId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);

    const def = MODULE_DEFINITIONS[current];
    if (!def) continue;

    if (def.requiresAll) {
      for (const dep of def.requiresAll) {
        if (!result.has(dep)) {
          queue.push(dep);
        }
      }
    }

    if (def.requiresAny) {
      const hasAny = def.requiresAny.some((dep) => result.has(dep) || queue.includes(dep));
      if (!hasAny) {
        queue.push(def.requiresAny[0]);
      }
    }
  }

  return result;
}

export function getDisableCascade(enabledSet: Set<ModuleId>, moduleId: ModuleId): ModuleId[] {
  const toDisable = new Set<ModuleId>();
  const queue: ModuleId[] = [moduleId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (toDisable.has(current)) continue;
    toDisable.add(current);

    for (const other of enabledSet) {
      if (toDisable.has(other)) continue;

      const def = MODULE_DEFINITIONS[other];
      if (!def) continue;

      if (def.requiresAll && def.requiresAll.includes(current)) {
        queue.push(other);
        continue;
      }

      if (def.requiresAny) {
        const anyAvailable = def.requiresAny.some(
          (dep) => enabledSet.has(dep) && !toDisable.has(dep) && dep !== current
        );
        if (!anyAvailable) {
          queue.push(other);
        }
      }
    }
  }

  return [...toDisable].reverse();
}
