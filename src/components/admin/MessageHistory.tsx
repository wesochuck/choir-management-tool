import { useEffect, useState } from 'react';
import { AppCard } from '../common/AppCard';
import { type MessageRecord, type CommunicationRecipient } from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Pagination } from '../common/Pagination';
import '../../views/admin/communications/Communications.css';

interface MessageHistoryProps {
  history: MessageRecord[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
  onViewDetails: (message: MessageRecord) => void;
  onCopyDraft: (message: MessageRecord) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  events: Event[];
  commSettings: CommunicationSettings;
}

export function MessageHistory({
  history,
  currentPage,
  totalPages,
  onPageChange,
  historySearchQuery,
  onHistorySearchChange,
  onViewDetails,
  onCopyDraft,
  onViewRecipients,
  events,
  commSettings,
}: MessageHistoryProps) {
  const [searchTerm, setSearchTerm] = useState(historySearchQuery);

  // Debounce sync to parent
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchTerm !== historySearchQuery) {
        onHistorySearchChange(searchTerm);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm, historySearchQuery, onHistorySearchChange]);

  // Sync back if parent state changes (e.g. cleared elsewhere)
  useEffect(() => {
    setSearchTerm(historySearchQuery);
  }, [historySearchQuery]);

  return (
    <div className="flex-col comm-compose-form">
      <div className="comm-message-list-header">
        <div className="comm-message-search-container">
          <input
            type="text"
            className="input comm-message-search-input"
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingRight: searchTerm ? '32px' : '12px' }} // @allow-inline-style - dynamic padding based on clear button
          />
          {searchTerm && (
            <button
              type="button"
              className="comm-message-search-clear"
              onClick={() => {
                setSearchTerm('');
                onHistorySearchChange('');
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <AppCard noPadding>
        {history.map((message) => {
          const mFilters = message.filters as Record<string, unknown>;
          const mType = mFilters?.type as string | undefined;
          const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
          
          // Resolve placeholders for subject preview
          const eventId = mFilters?.eventId as string | undefined;
          const linkedEvent = events.find(e => e.id === eventId) || null;
          const resolvedSubject = resolvePreviewContent(
            message.subject || 'SMS message',
            linkedEvent,
            null,
            commSettings.mailingAddress
          );

          return (
            <div key={message.id} className="comm-message-item flex-responsive">
              <div className="comm-message-info">
                <div className="comm-message-meta">
                  <span className="badge badge-rehearsal comm-message-badge">{message.type}</span>
                  {message.status === 'Archived' && (
                    <span className="badge badge-muted comm-message-badge comm-color-muted-bg">
                      Archived
                    </span>
                  )}
                  {isAutomated && <span className="badge badge-concert comm-message-badge comm-opacity-80">{mType}</span>}
                  <span className="text-muted text-xs">{new Date(message.created).toLocaleString()}</span>
                </div>
                <h3 className="comm-message-subject">{resolvedSubject}</h3>
                <button
                  type="button"
                  className="btn btn-ghost comm-message-recipients-link"
                  onClick={() =>
                    onViewRecipients(
                      message.recipients,
                      `Recipients — ${resolvedSubject}`
                    )
                  }
                >
                  {message.recipients.length} recipient{message.recipients.length !== 1 ? 's' : ''} →
                </button>
              </div>
              <div className="flex-row comm-gap-6px">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(message)}>Details</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyDraft(message)}>Copy to Draft</button>
              </div>
            </div>
          );
        })}
        {history.length === 0 && (
          <div className="admin-empty-state">
            <p className="text-muted">
              {historySearchQuery 
                ? `No messages found matching "${historySearchQuery}".` 
                : "No messages logged yet."}
            </p>
          </div>
        )}
      </AppCard>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
