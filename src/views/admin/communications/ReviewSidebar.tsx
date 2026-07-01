import type React from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { AudienceStatCards } from './AudienceStatCards';
import { PreFlightChecklist } from './PreFlightChecklist';
import type { CommunicationRecipient } from '../../../services/communicationService';
import type { CommunicationFilters } from '../../../services/communicationService';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { Event } from '../../../services/eventService';
import type { CommunicationTab } from '../../../types/Communication';
import type { WizardStep } from './types';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';

interface ReviewSidebarProps {
  selectedRecipients: CommunicationRecipient[];
  recipientCounts: { total: number; hasEmail: number; hasPhone: number };
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  subject: string;
  content: string;
  messageType: 'Email' | 'SMS' | 'Both';
  filters: CommunicationFilters;
  selectedEvent: Event | null;
  commSettings: CommunicationSettings;
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<
    React.SetStateAction<Partial<
      import('../../../services/communicationService').TemplateRecord
    > | null>
  >;
  isSendingTest: boolean;
  isSending: boolean;
  handleSendTest: () => Promise<void>;
  sendMessage: () => Promise<void>;
  setWizardStep: (step: WizardStep) => void;
  user: import('../../../types/auth').ChoirUser | null;
}

export function ReviewSidebar({
  selectedRecipients,
  recipientCounts,
  onViewRecipients,
  subject,
  content,
  messageType,
  filters,
  selectedEvent,
  commSettings,
  setTab,
  setEditingTemplate,
  isSendingTest,
  isSending,
  handleSendTest,
  sendMessage,
  setWizardStep,
  user,
}: ReviewSidebarProps) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  return (
    <aside className="flex flex-col gap-5">
      {/* Card 1: Recipient summary */}
      <AppCard
        title="Recipient Summary"
        actions={
          <Button
            type="button"
            variant="outline"
            size="small"
            disabled={selectedRecipients.length === 0}
            onClick={() => onViewRecipients(selectedRecipients, 'Recipients Selected for Send')}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="mr-1 inline-flex size-4"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            View List
          </Button>
        }
      >
        <div className="mt-1">
          <AudienceStatCards
            cards={[
              {
                label: 'Total Audience',
                count: recipientCounts.total,
                subtitle: `matched ${performerLabelPlural.toLowerCase()}`,
                color: 'neutral',
              },
              {
                label: 'Via Email',
                count: recipientCounts.hasEmail,
                subtitle: 'receive email',
                color: 'emerald',
              },
              {
                label: 'Via SMS',
                count: recipientCounts.hasPhone,
                subtitle: 'receive SMS text',
                color: 'blue',
              },
            ]}
            onCardClick={(index) => {
              if (index === 0) {
                onViewRecipients(selectedRecipients, 'Recipient List (Total Audience)');
              } else if (index === 1) {
                onViewRecipients(
                  selectedRecipients.filter((r) => r.email?.trim()),
                  'Recipient List (Via Email)'
                );
              } else {
                onViewRecipients(
                  selectedRecipients.filter((r) => r.phone?.trim()),
                  'Recipient List (Via SMS)'
                );
              }
            }}
          />
        </div>
      </AppCard>

      {/* Card 2: Pre-flight checklist */}
      <PreFlightChecklist
        subject={subject}
        content={content}
        messageType={messageType}
        selectedRecipients={selectedRecipients}
        filters={filters}
        selectedEvent={selectedEvent}
        commSettings={commSettings}
        setTab={setTab}
        setEditingTemplate={setEditingTemplate}
      />

      {/* Card 3: Sending Actions */}
      <AppCard title="Sending Actions">
        <div className="flex w-full gap-3 max-md:flex-col-reverse">
          <Button
            variant="outline"
            onClick={() => setWizardStep('COMPOSE')}
            className="w-full md:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 transition-transform duration-200"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Button>

          <Button
            variant="secondary"
            onClick={handleSendTest}
            disabled={isSendingTest || isSending}
            title={`Send email test to ${user?.email || 'your email'}`}
            className="w-full md:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 transition-transform duration-200"
              aria-hidden="true"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
          </Button>

          <Button
            variant="primary"
            onClick={sendMessage}
            disabled={isSending || selectedRecipients.length === 0}
            className="w-full md:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 transition-transform duration-200"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {isSending ? 'Sending...' : `Send to ${selectedRecipients.length} ${performerLabelPlural}`}
          </Button>
        </div>
      </AppCard>
    </aside>
  );
}
