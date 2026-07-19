import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminPageTabs } from '../../components/admin/AdminPageTabs';
import TicketingWillCallTab from './ticketing/TicketingWillCallTab';
import TicketingBundlesTab from './ticketing/TicketingBundlesTab';
import TicketingOrdersTab from './ticketing/TicketingOrdersTab';
import TicketingShareTab from './ticketing/TicketingShareTab';
import TicketingConfirmationSettings from './ticketing/TicketingConfirmationSettings';

type TicketingTab = 'willcall' | 'bundles' | 'orders' | 'share' | 'confirmation';

function renderActiveTab(tab: TicketingTab) {
  switch (tab) {
    case 'willcall':
      return <TicketingWillCallTab />;
    case 'bundles':
      return <TicketingBundlesTab />;
    case 'orders':
      return <TicketingOrdersTab />;
    case 'share':
      return <TicketingShareTab />;
    case 'confirmation':
      return <TicketingConfirmationSettings />;
  }
}

export default function TicketingView() {
  useDocumentTitle('Ticketing');
  const [activeTab, setActiveTab] = useState<TicketingTab>('willcall');

  return (
    <div className="flex w-full flex-col gap-6">
      <AdminPageHeader
        title="Ticketing Dashboard"
        description="Manage ticket sales, configure season bundles, and view check-in checklists."
        below={
          <AdminPageTabs
            ariaLabel="Ticketing sections"
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as TicketingTab)}
            tabs={[
              { value: 'willcall', label: 'Concert Will Call' },
              { value: 'bundles', label: 'Season Bundles' },
              { value: 'orders', label: 'Bundle Orders' },
              { value: 'share', label: 'Share & QR Codes' },
              { value: 'confirmation', label: 'Confirmation Page' },
            ]}
            actions={
              <Button as={Link} to="/admin/tickets/scan" variant="primary" className="no-underline">
                Scan Tickets
              </Button>
            }
          />
        }
      />

      {renderActiveTab(activeTab)}
    </div>
  );
}
