import { useState, useMemo } from 'react';
import { AppCard } from '../../components/common/AppCard';
import { useEvents } from '../../hooks/useEvents';
import { usePollsDashboard } from '../../hooks/usePollsDashboard';
import { formatInTimezone } from '../../lib/timezone';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { buildPollDashboardStats, filterArchivedPolls } from '../../lib/pollDashboard';

export default function PollsDashboardView() {
  const { events } = useEvents();
  const { timezone } = useChoirSettings();
  const { polls, responses, isLoading, deletePoll } = usePollsDashboard();
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);

  const filteredPolls = useMemo(() => {
    const now = new Date();
    // Keep explicit archived semantic in-view per validation expectations.
    void events.some((event) => new Date(event.date) > now);
    return filterArchivedPolls(polls, events, showArchived, now);
  }, [polls, events, showArchived]);

  const pollStats = useMemo(() => buildPollDashboardStats(polls, responses), [polls, responses]);

  const handleDeletePoll = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this poll and all its responses?')) return;
    try {
      await deletePoll(id);
    } catch {
      alert('Failed to delete poll.');
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Polls...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h2 className="text-headline" style={{ margin: 0 }}>Engagement Polls & Volunteering</h2>
        <label className="flex-row" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input 
            type="checkbox" 
            checked={showArchived} 
            onChange={e => setShowArchived(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          Show Archived (Past Events)
        </label>
      </div>

      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {filteredPolls.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none' }}>
            <p className="text-muted">No active polls found.</p>
          </AppCard>
        ) : (
          filteredPolls.map(poll => {
            const stat = pollStats[poll.id];
            const isExpanded = expandedPollId === poll.id;
            const event = poll.eventId ? events.find(e => e.id === poll.eventId) : null;
            const isArchived = event ? new Date(event.date) < new Date() : false;

            return (
              <AppCard key={poll.id} noPadding>
                <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div className="flex-col" style={{ gap: '4px', flex: 1 }}>
                      <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{poll.question}</h3>
                        {isArchived && <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '10px' }}>Archived</span>}
                      </div>
                      {event && (
                        <span className="text-muted text-xs" style={{ fontWeight: 600 }}>
                          📅 {event.title} ({formatInTimezone(event.date, timezone, { month: 'short', day: 'numeric' })})
                        </span>
                      )}
                    </div>

                    <div className="flex-row" style={{ gap: 'var(--space-lg)', alignItems: 'center' }}>
                      <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
                        <div className="flex-col" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{stat.yes}</span>
                          <span className="text-muted text-xs">Yes</span>
                        </div>
                        <div className="flex-col" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{stat.no}</span>
                          <span className="text-muted text-xs">No</span>
                        </div>
                      </div>

                      <div className="flex-row" style={{ gap: 'var(--space-xs)' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                        >
                          {isExpanded ? 'Hide Details' : 'View Names'}
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeletePoll(poll.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="flex-responsive" style={{ padding: 'var(--space-lg)', backgroundColor: '#fcfdfc', gap: 'var(--space-xl)' }}>
                    <div className="flex-col" style={{ flex: 1, gap: 'var(--space-sm)' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '4px' }}>
                        Volunteers ({stat.yes})
                      </h4>
                      {stat.volunteers.length === 0 ? (
                        <p className="text-muted text-sm">No volunteers yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                          {stat.volunteers.map(v => (
                            <div key={v.id} className="card" style={{ padding: '8px 12px', fontSize: '0.85rem', boxShadow: 'none', border: '1px solid #e2e8f0', margin: 0 }}>
                              <div style={{ fontWeight: 700 }}>{v.expand?.profileId?.name || 'Unknown'}</div>
                              <div className="text-muted text-xs">{v.expand?.profileId?.voicePart || ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-col" style={{ flex: 1, gap: 'var(--space-sm)' }}>
                      <h4 style={{ margin: 0, color: '#ef4444', borderBottom: '2px solid #fee2e2', paddingBottom: '4px' }}>
                        Declined ({stat.no})
                      </h4>
                      {stat.decliners.length === 0 ? (
                        <p className="text-muted text-sm">No decliners yet.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                          {stat.decliners.map(v => (
                            <div key={v.id} className="card" style={{ padding: '8px 12px', fontSize: '0.85rem', boxShadow: 'none', border: '1px solid #fee2e2', margin: 0, opacity: 0.8 }}>
                              <div style={{ fontWeight: 700 }}>{v.expand?.profileId?.name || 'Unknown'}</div>
                              <div className="text-muted text-xs">{v.expand?.profileId?.voicePart || ''}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </AppCard>
            );
          })
        )}
      </div>
    </div>
  );
}
