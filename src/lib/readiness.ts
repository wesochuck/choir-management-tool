import type { ModuleId } from './modules';

export interface ReadinessSnapshot {
  hasAdmin: boolean;
  choirName: string;
  hasVoiceParts: boolean;
  hasSections: boolean;
  modulesSelected: boolean;
  enabledModules: Set<ModuleId>;
  emailVerified: boolean;
  stripeConfigured: boolean;
  websiteConfigured: boolean;
  auditionsConfigured: boolean;
  hasSingers: boolean;
}

interface ReadinessItem {
  id: string;
  label: string;
  moduleId: ModuleId | null;
  destination: string;
  requiredForLaunch: boolean;
  evaluate: (snapshot: ReadinessSnapshot) => boolean;
}

const READINESS_ITEMS: ReadinessItem[] = [
  {
    id: 'admin-claimed',
    label: 'Claim administrator account',
    moduleId: null,
    destination: '/login',
    requiredForLaunch: true,
    evaluate: (s) => s.hasAdmin,
  },
  {
    id: 'org-basics',
    label: 'Configure organization basics',
    moduleId: null,
    destination: '/admin/settings',
    requiredForLaunch: true,
    evaluate: (s) => !!s.choirName,
  },
  {
    id: 'module-selection',
    label: 'Select active modules',
    moduleId: null,
    destination: '/admin/settings/modules',
    requiredForLaunch: true,
    evaluate: (s) => s.modulesSelected,
  },
  {
    id: 'roster-structure',
    label: 'Configure roster voice parts & sections',
    moduleId: 'roster',
    destination: '/admin/settings',
    requiredForLaunch: true,
    evaluate: (s) => s.hasVoiceParts && s.hasSections,
  },
  {
    id: 'email-verified',
    label: 'Verify Mailjet/comms credentials',
    moduleId: 'communications',
    destination: '/admin/settings',
    requiredForLaunch: false,
    evaluate: (s) => s.emailVerified,
  },
  {
    id: 'stripe-configured',
    label: 'Configure Stripe keys for ticketing & donations',
    moduleId: 'ticketSales',
    destination: '/admin/settings',
    requiredForLaunch: false,
    evaluate: (s) => s.stripeConfigured,
  },
  {
    id: 'website-info',
    label: 'Set up public website basic details',
    moduleId: 'publicWebsite',
    destination: '/admin/website',
    requiredForLaunch: false,
    evaluate: (s) => s.websiteConfigured,
  },
  {
    id: 'auditions-configured',
    label: 'Configure audition slots & requirements',
    moduleId: 'auditions',
    destination: '/admin/auditions',
    requiredForLaunch: false,
    evaluate: (s) => s.auditionsConfigured,
  },
  {
    id: 'singers-imported',
    label: 'Add singers to the roster',
    moduleId: 'roster',
    destination: '/admin/roster',
    requiredForLaunch: false,
    evaluate: (s) => s.hasSingers,
  },
];

export interface ReadinessResult {
  id: string;
  label: string;
  applicable: boolean;
  completed: boolean;
  requiredForLaunch: boolean;
  destination: string;
}

export function evaluateReadiness(snapshot: ReadinessSnapshot): {
  items: ReadinessResult[];
  readyForLaunch: boolean;
} {
  const results = READINESS_ITEMS.map((item) => {
    const applicable = item.moduleId === null || snapshot.enabledModules.has(item.moduleId);
    const completed = applicable ? item.evaluate(snapshot) : false;
    return {
      id: item.id,
      label: item.label,
      applicable,
      completed,
      requiredForLaunch: item.requiredForLaunch,
      destination: item.destination,
    };
  });

  const readyForLaunch = results.every(
    (item) => !item.applicable || !item.requiredForLaunch || item.completed
  );

  return {
    items: results,
    readyForLaunch,
  };
}
