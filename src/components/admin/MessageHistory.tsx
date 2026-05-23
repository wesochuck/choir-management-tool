import { AppCard } from '../common/AppCard';
import { type MessageRecord } from '../../services/communicationService';
import { type Event } from '../../services/eventService';
import { type CommunicationSettings } from '../../services/settingsService';
import { resolvePreviewContent } from '../../lib/communicationUtils';

interface MessageHistoryProps {
  history: MessageRecord[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onViewDetails: (message: MessageRecord) => void;
  onCopyDraft: (message: MessageRecord) => void;
  events: Event[];
  commSettings: CommunicationSettings;
}

export function MessageHistory({
  history,
  currentPage,
  pageSize,
  onPageChange,
  onViewDetails,
  onCopyDraft,
  events,
  commSettings,
}: MessageHistoryProps) {
  const totalPages = Math.ceil(history.length / pageSize) || 1;
  const safePage = currentPage > totalPages ? 1 : currentPage;
  const startIdx = (safePage - 1) * pageSize;
  const paginatedHistory = history.slice(startIdx, startIdx + pageSize);

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      <AppCard noPadding>
        {paginatedHistory.map((message) => {
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
                  {isAutomated && <span className="badge badge-concert" style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.8 }}>{mType}</span>}
                  <span className="text-muted text-xs">{new Date(message.created).toLocaleString()}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{resolvedSubject}</h3>
                <p className="text-muted text-xs" style={{ margin: 0 }}>{message.recipients.length} recipients</p>
              </div>
              <div className="flex-row" style={{ gap: '6px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onViewDetails(message)}>Details</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onCopyDraft(message)}>Copy to Draft</button>
              </div>
            </div>
          );
        })}
        {history.length === 0 && <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><p className="text-muted">No messages logged yet.</p></div>}
      </AppCard>

      {history.length > pageSize && (
        <div className="flex-row" style={{ justifyContent: 'center', alignItems: 'center', gap: 'var(--space-md)', marginTop: '4px' }}>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm"
            disabled={safePage === 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            ◀ Previous
          </button>
          <span className="text-muted text-sm" style={{ fontWeight: 600 }}>
            Page {safePage} of {totalPages}
          </span>
          <button 
            type="button" 
            className="btn btn-ghost btn-sm"
            disabled={safePage === totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next ▶
          </button>
        </div>
      )}
    </div>
  );
}
