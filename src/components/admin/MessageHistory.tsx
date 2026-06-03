import { useEffect, useState } from 'react';
import { AppCard } from '../common/AppCard';
import { type MessageRecord, type CommunicationRecipient } from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';
import { Pagination } from '../common/Pagination';

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
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      <div className="flex-row" style={{ gap: 'var(--space-sm)', marginBottom: '4px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input"
            placeholder="Search message history (subject, content, type)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingRight: searchTerm ? '32px' : '12px' }}
          />
          {searchTerm && (
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setSearchTerm('');
                onHistorySearchChange('');
              }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '1.2rem',
                lineHeight: 1,
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
            <div key={message.id} className="message-list-item flex-responsive" style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-col" style={{ gap: '4px' }}>
                <div className="flex-row" style={{ gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <span className="badge badge-rehearsal" style={{ fontSize: '10px', padding: '2px 6px' }}>{message.type}</span>
                  {message.status === 'Archived' && (
                    <span
                      className="badge badge-muted"
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        backgroundColor: '#94a3b8',
                        color: 'white',
                      }}
                    >
                      Archived
                    </span>
                  )}
                  {isAutomated && <span className="badge badge-concert" style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.8 }}>{mType}</span>}
                  <span className="text-muted text-xs">{new Date(message.created).toLocaleString()}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{resolvedSubject}</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: 0,
                    height: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    textDecoration: 'underline',
                    alignSelf: 'flex-start',
                    cursor: 'pointer',
                  }}
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
              <div className="flex-row" style={{ gap: '6px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(message)}>Details</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyDraft(message)}>Copy to Draft</button>
              </div>
            </div>
          );
        })}
        {history.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
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
