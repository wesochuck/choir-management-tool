import type React from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../../../components/common/AppCard';
import { AlertBanner } from './AlertBanner';
import type { CommunicationRecipient } from '../../../services/communicationService';
import type { CommunicationFilters } from '../../../services/communicationService';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { Event } from '../../../services/eventService';
import type { CommunicationTab } from '../../../types/Communication';

interface PreFlightChecklistProps {
  subject: string;
  content: string;
  messageType: 'Email' | 'SMS' | 'Both';
  selectedRecipients: CommunicationRecipient[];
  filters: CommunicationFilters;
  selectedEvent: Event | null;
  commSettings: CommunicationSettings;
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<
    React.SetStateAction<Partial<
      import('../../../services/communicationService').TemplateRecord
    > | null>
  >;
}

export function PreFlightChecklist({
  subject,
  content,
  messageType,
  selectedRecipients,
  filters,
  selectedEvent,
  commSettings,
  setTab,
  setEditingTemplate,
}: PreFlightChecklistProps) {
  const hasApprovedSetList = selectedEvent ? selectedEvent.setListApproved !== false : false;

  return (
    <AppCard title="Pre-Flight Checklist">
      <div className="flex flex-col gap-2">
        {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
          <AlertBanner variant="warning" icon="⚠️" title="Subject is empty.">
            Add a subject line for better open rates.
          </AlertBanner>
        )}

        {content.length < 10 && (
          <AlertBanner variant="warning" icon="⚠️" title="Very short message body." />
        )}

        {selectedRecipients.length === 0 && (
          <AlertBanner variant="warning" icon="⚠️" title="No recipients selected." />
        )}

        {!filters.eventId &&
          (() => {
            const eventPlaceholders = [
              '{eventTitle}',
              '{eventType}',
              '{eventDate}',
              '{eventLocation}',
              '{eventDetails}',
              '{setlist}',
              '{{PLAYER_LINK}}',
              '{{RSVP_LINKS}}',
            ];
            const combinedText = (subject + ' ' + content).toLowerCase();
            const foundPlaceholders = eventPlaceholders.filter((p) =>
              combinedText.includes(p.toLowerCase())
            );
            if (foundPlaceholders.length === 0) return null;
            return (
              <AlertBanner variant="warning" icon="⚠️" title="No event selected">
                but active event placeholders exist: <code>{foundPlaceholders.join(', ')}</code>.
              </AlertBanner>
            );
          })()}

        {filters.eventId &&
          !hasApprovedSetList &&
          content.toLowerCase().includes('{{player_link}}') && (
            <AlertBanner variant="warning" icon="⚠️" title="Practice player not approved.">
              Set list is unapproved; <code>{'{{PLAYER_LINK}}'}</code> button will not render.
            </AlertBanner>
          )}

        {filters.eventId && !hasApprovedSetList && content.toLowerCase().includes('{setlist}') && (
          <AlertBanner variant="warning" icon="⚠️" title="Set list not approved.">
            The set list hasn't been approved for singers yet.{' '}
            <Link
              to="/admin/setlists"
              className="text-primary hover:text-primary-deep cursor-pointer font-semibold underline"
            >
              Open Set List Builder
            </Link>{' '}
            to approve it before sending.
          </AlertBanner>
        )}

        {selectedRecipients.some((r) => !r.email) &&
          (messageType === 'Email' || messageType === 'Both') && (
            <AlertBanner
              variant="info"
              icon={
                <svg
                  className="mt-0.5 size-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              }
              title={`${selectedRecipients.filter((r) => !r.email).length} singers`}
            >
              have no email configured and will skip this channel.
            </AlertBanner>
          )}

        {selectedRecipients.some((r) => !r.phone) &&
          (messageType === 'SMS' || messageType === 'Both') && (
            <AlertBanner
              variant="info"
              icon={
                <svg
                  className="mt-0.5 size-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              }
              title={`${selectedRecipients.filter((r) => !r.phone).length} singers`}
            >
              have no phone configured and will skip this channel.
            </AlertBanner>
          )}

        {commSettings.mailingAddress.includes('123 Choir St') &&
          (messageType === 'Email' || messageType === 'Both') && (
            <AlertBanner variant="warning" icon="⚠️" title="Default physical address active.">
              Please{' '}
              <button
                type="button"
                className="text-primary hover:text-primary-deep cursor-pointer font-semibold underline"
                onClick={() => {
                  setTab('settings');
                  setEditingTemplate(null);
                }}
              >
                update this in settings
              </button>{' '}
              for CAN-SPAM legal compliance.
            </AlertBanner>
          )}

        <AlertBanner
          variant="success"
          icon={
            <svg
              className="mt-0.5 size-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
          title="Compliance footer will be attached."
        />
      </div>
    </AppCard>
  );
}
