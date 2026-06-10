import { useState } from 'react';
import { MessageHistory, type SourceFilter } from '../../../components/admin/MessageHistory';
import type { MessageRecord, CommunicationRecipient } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';

interface HistoryPanelProps {
  history: MessageRecord[];
  historyPage: number;
  totalPages: number;
  setHistoryPage: (page: number) => void;
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
  events: Event[];
  commSettings: CommunicationSettings;
  onViewDetails: (message: MessageRecord) => void;
  onCopyDraft: (message: MessageRecord) => void;
  onViewRecipients: (
    recipients: CommunicationRecipient[],
    title: string
  ) => void;
}

export function HistoryPanel({
  history,
  historyPage,
  totalPages,
  setHistoryPage,
  historySearchQuery,
  onHistorySearchChange,
  events,
  commSettings,
  onViewDetails,
  onCopyDraft,
  onViewRecipients,
}: HistoryPanelProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  return (
    <div className="flex flex-col gap-4">
      <MessageHistory
          history={history}
          currentPage={historyPage}
          totalPages={totalPages}
          onPageChange={setHistoryPage}
          historySearchQuery={historySearchQuery}
          onHistorySearchChange={onHistorySearchChange}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          onViewDetails={onViewDetails}
          onCopyDraft={onCopyDraft}
          onViewRecipients={onViewRecipients}
          events={events}
          commSettings={commSettings}
        />
    </div>
  );
}
