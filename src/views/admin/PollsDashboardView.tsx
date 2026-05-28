import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { pb } from '../../lib/pocketbase';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone } from '../../lib/timezone';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import type { RecordModel } from 'pocketbase';

interface PollRecord extends RecordModel {
  question: string;
  eventId?: string;
  created?: string;
  updated?: string;
}

interface PollResponseRecord extends RecordModel {
  pollId: string;
  profileId: string;
  status: 'Yes' | 'No';
  expand?: {
    profileId: {
      name: string;
      voicePart: string;
    }
  };
}

export default function PollsDashboardView() {
  const dialog = useDialog();
  const { events } = useEvents();
  const { timezone } = useChoirSettings();
  const [polls, setPolls] = useState<PollRecord[]>([]);
  const [responses, setResponses] = useState<PollResponseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [pollList, responseList] = await Promise.all([
        pb.collection('polls').getFullList<PollRecord>({ sort: '-id' }),
        pb.collection('pollResponses').getFullList<PollResponseRecord>({ expand: 'profileId' }),
      ]);
      setPolls(pollList);
      setResponses(responseList);
    } catch (err) {
      console.error('Failed to load poll dashboard data', err);
      setLoadError('Unable to load polls. Check PocketBase collection fields, API rules, and browser console.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredPolls = useMemo(() => {
    const now = new Date();
    return polls.filter(poll => {
      if (showArchived) return true;
      if (!poll.eventId) return true; // Polls without events stay active
      const event = events.find(e => e.id === poll.eventId);
      if (!event) return true;
      return new Date(event.date) > now;
    });
  }, [polls, events, showArchived]);

  const pollStats = useMemo(() => {
    const stats: Record<string, { yes: number; no: number; volunteers: PollResponseRecord[]; decliners: PollResponseRecord[] }> = {};
    
    polls.forEach(p => {
      stats[p.id] = { yes: 0, no: 0, volunteers: [], decliners: [] };
    });

    responses.forEach(r => {
      if (stats[r.pollId]) {
        if (r.status === 'Yes') {
          stats[r.pollId].yes++;
          stats[r.pollId].volunteers.push(r);
        } else {
          stats[r.pollId].no++;
          stats[r.pollId].decliners.push(r);
        }
      }
    });

    return stats;
  }, [polls, responses]);

  const handleDeletePoll = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Poll',
      message: 'Are you sure you want to delete this poll and all its responses?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await pb.collection('polls').delete(id);
      setPolls(prev => prev.filter(p => p.id !== id));
      setResponses(prev => prev.filter(r => r.pollId !== id));
      dialog.showToast('Poll deleted.');
    } catch {
      await dialog.showMessage({
        title: 'Delete Failed',
        message: 'Failed to delete poll.',
        variant: 'danger',
      });
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Polls...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h2 className="text-headline" style={{ margin: 0 }}>Engagement Polls & Volunteering</h2>
        <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
          <label className="flex-row" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Show Archived (Past Events)
          </label>
          <button 
            type="button"
            className="btn btn-primary btn-sm flex-row" 
            style={{ gap: '6px', height: '36px', display: 'flex', alignItems: 'center' }}
            onClick={() => setIsInfoModalOpen(true)}
          >
            <span>+</span> Start New Poll
          </button>
        </div>
      </div>

      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {loadError && (
          <AppCard style={{ padding: 'var(--space-md)', borderColor: '#ef4444' }}>
            <p style={{ margin: 0, color: '#ef4444' }}>{loadError}</p>
          </AppCard>
        )}
        {filteredPolls.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>No active polls found.</p>
            <div style={{ maxWidth: '480px', margin: '0 auto 24px auto', textAlign: 'left', backgroundColor: 'var(--bg)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '8px' }}>How to create a poll:</strong>
              <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Go to the <Link to="/admin/communications" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>Communications Dashboard</Link>.</li>
                <li>In the Composer, click the <strong>Engagement Poll</strong> placeholder badge.</li>
                <li>Create your poll question and insert it into your email/SMS.</li>
              </ol>
            </div>
            <div>
              <button type="button" className="btn btn-primary" onClick={() => setIsInfoModalOpen(true)}>
                Start New Poll
              </button>
            </div>
          </AppCard>
        ) : (
          filteredPolls.map(poll => {
            const stat = pollStats[poll.id];
            const isExpanded = expandedPollId === poll.id;
            const event = poll.eventId ? events.find(e => e.id === poll.eventId) : null;
            const isArchived = event ? new Date(event.date) < new Date() : false;

            return (
              <AppCard key={poll.id} noPadding>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedPollId(isExpanded ? null : poll.id); }}
                  style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
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

                      <div className="flex-row" style={{ gap: 'var(--space-xs)', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {isExpanded ? '▲ Hide' : '▼ Names'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444' }}
                          onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id); }}
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
                              <div style={{ fontWeight: 700 }}>{v.expand?.profileId.name}</div>
                              <div className="text-muted text-xs">{v.expand?.profileId.voicePart}</div>
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
                              <div style={{ fontWeight: 700 }}>{v.expand?.profileId.name}</div>
                              <div className="text-muted text-xs">{v.expand?.profileId.voicePart}</div>
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

      <BaseModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="📊 How to Start an Engagement Poll"
        maxWidth="520px"
      >
        <div className="flex-col" style={{ gap: 'var(--space-md)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          <p>
            Engagement Polls are sent to choir members inside communications (emails/SMS). Members can click their personalized button to answer without logging in.
          </p>
          
          <div style={{ backgroundColor: 'var(--bg)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <strong style={{ display: 'block', color: 'var(--text-main)', marginBottom: '10px' }}>Simple Steps:</strong>
            <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                Go to the <strong><Link to="/admin/communications" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }} onClick={() => setIsInfoModalOpen(false)}>Communications Dashboard</Link></strong>.
              </li>
              <li>
                In the <strong>Composer</strong> (Step 2), click the <strong>Engagement Poll</strong> placeholder badge on the right panel.
              </li>
              <li>
                Select or create a new poll question, then insert the placeholder tag into your message.
              </li>
              <li>
                Send the email/SMS. Once sent, members' answers will automatically compile on this dashboard!
              </li>
            </ol>
          </div>
          
          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setIsInfoModalOpen(false)}>Cancel</button>
            <Link to="/admin/communications" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center' }} onClick={() => setIsInfoModalOpen(false)}>
              Go to Communications →
            </Link>
          </div>
        </div>
      </BaseModal>

    </div>
  );
}
