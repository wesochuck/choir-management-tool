import React, { useEffect, useState } from 'react';
import { BaseModal } from '../common/BaseModal';
import { pb } from '../../lib/pocketbase';
import { useEvents } from '../../hooks/useEvents';
import type { RecordModel } from 'pocketbase';

interface PollRecord extends RecordModel {
  question: string;
  eventId?: string;
}

interface PollSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pollId: string) => void;
}

export const PollSelectionModal: React.FC<PollSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [polls, setPolls] = useState<PollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { events } = useEvents();

  // Create form state
  const [question, setQuestion] = useState('');
  const [eventId, setEventId] = useState('');

  const loadPolls = async () => {
    setIsLoading(true);
    try {
      const list = await pb.collection('polls').getFullList<PollRecord>();
      setPolls(list);
    } catch (err) {
      console.error('Failed to load polls', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPolls();
      setTab('list');
      setQuestion('');
      setEventId('');
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setIsCreating(true);
    try {
      const record = await pb.collection('polls').create<PollRecord>({
        question,
        eventId: eventId || null,
      });
      onSelect(record.id);
      onClose();
    } catch (err) {
      console.error('Failed to create poll', err);
      alert('Failed to create poll. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Engagement Polls"
      maxWidth="500px"
    >
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-row" style={{ gap: 'var(--space-xs)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)' }}>
          <button
            className={`btn btn-sm ${tab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('list')}
          >
            Existing Polls
          </button>
          <button
            className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('create')}
          >
            Create New Poll
          </button>
        </div>

        {tab === 'list' ? (
          <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
            {isLoading ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>Loading polls...</p>
            ) : polls.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>No polls found. Create one to get started!</p>
            ) : (
              polls.map(poll => (
                <button
                  key={poll.id}
                  className="card flex-col"
                  style={{ textAlign: 'left', padding: 'var(--space-sm) var(--space-md)', gap: '4px', cursor: 'pointer', border: '1px solid var(--border)' }}
                  onClick={() => onSelect(poll.id)}
                >
                  <strong style={{ fontSize: '0.95rem' }}>{poll.question}</strong>
                  {poll.eventId && (
                    <span className="text-muted text-xs">
                      Linked to: {events.find(e => e.id === poll.eventId)?.title || 'Event'}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Poll Question</label>
              <input
                className="card"
                autoFocus
                required
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Can you help with riser setup?"
                style={{ height: '44px', padding: '0 12px' }}
              />
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Linked Event (Optional)</label>
              <select
                className="card"
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                style={{ height: '44px', padding: '0 12px' }}
              >
                <option value="">No Linked Event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.type} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isCreating || !question}>
                {isCreating ? 'Creating...' : 'Create & Insert Poll'}
              </button>
            </div>
          </form>
        )}
      </div>
    </BaseModal>
  );
};
