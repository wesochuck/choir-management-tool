import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { AudienceStatCards } from './AudienceStatCards';
import type { CommunicationRecipient } from '../../../services/communicationService';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';

interface RecipientSummaryCardProps {
  selectedRecipients: CommunicationRecipient[];
  recipientCounts: { total: number; hasEmail: number; hasPhone: number };
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
}

export function RecipientSummaryCard({
  selectedRecipients,
  recipientCounts,
  onViewRecipients,
}: RecipientSummaryCardProps) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);

  return (
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
          Review recipients
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
  );
}
