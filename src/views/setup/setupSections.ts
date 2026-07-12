import type React from 'react';
import type { ModuleId } from '../../lib/modules';
import RosterFeatureSetup from './featureSteps/RosterFeatureSetup';
import EventsFeatureSetup from './featureSteps/EventsFeatureSetup';
import MusicFeatureSetup from './featureSteps/MusicFeatureSetup';
import EngagementFeatureSetup from './featureSteps/EngagementFeatureSetup';
import CommercialFeatureSetup from './featureSteps/CommercialFeatureSetup';
import PublicFeatureSetup from './featureSteps/PublicFeatureSetup';

export interface SetupSectionDef {
  id: string;
  title: string;
  moduleId: ModuleId;
  component: React.ComponentType<{
    onSuccess: () => void;
    onSetLater?: () => void;
  }>;
}

export const SETUP_SECTIONS: SetupSectionDef[] = [
  {
    id: 'roster-setup',
    title: 'Roster Automation',
    moduleId: 'roster',
    component: RosterFeatureSetup,
  },
  {
    id: 'events-setup',
    title: 'Events & Reminders',
    moduleId: 'events',
    component: EventsFeatureSetup,
  },
  {
    id: 'music-setup',
    title: 'Music Library',
    moduleId: 'musicLibrary',
    component: MusicFeatureSetup,
  },
  {
    id: 'engagement-setup',
    title: 'Engagement & Directory',
    moduleId: 'resources',
    component: EngagementFeatureSetup,
  },
  {
    id: 'commercial-setup',
    title: 'Ticketing & Stripe',
    moduleId: 'ticketSales',
    component: CommercialFeatureSetup,
  },
  {
    id: 'public-setup',
    title: 'Public Website',
    moduleId: 'publicWebsite',
    component: PublicFeatureSetup,
  },
];
