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
  onSelect: (pollId: string, pollQuestion: string) => void;
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
      const list = await pb.collection('polls').getFullList<PollRecord>({ sort: '-created' });
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
      onSelect(record.id, record.question);
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
      title="📊 Insert a Poll"
      maxWidth="500px"
    >

      <div className="flex-col gap-4">
        <div className="flex-row gap-1 border-b border-border pb-1">
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
          <div className="flex-col gap-2">
            <div className="max-h-[400px] flex-col gap-2 overflow-y-auto">
              {isLoading ? (
                <p className="text-muted p-4 text-center">Loading polls...</p>
              ) : polls.length === 0 ? (
                <p className="text-muted p-4 text-center">No polls found. Create one to get started!</p>
              ) : (
                polls.map(poll => (
                  <button
                    key={poll.id}
                    className="bg-surface hover:bg-bg border border-border rounded-xl shadow-sm p-3 px-4 text-left flex flex-col gap-1 cursor-pointer transition-all duration-200"
                    onClick={() => {
                      onSelect(poll.id, poll.question);
                      onClose();
                    }}
                  >
                    <strong className="text-[0.95rem]">{poll.question}</strong>
                    {poll.eventId && (
                      <span className="text-muted text-xs">
                        Linked to: {events.find(e => e.id === poll.eventId)?.title || 'Event'}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="mt-1 flex-row justify-end">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex-col gap-4">
            <div className="flex-col gap-1">
              <label className="text-label">Poll Question</label>
              <input
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 px-3"
                autoFocus
                required
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Can you help with riser setup?"
              />
            </div>

            <div className="flex-col gap-1">
              <label className="text-label">Linked Event (Optional)</label>
              <select
                className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-11 px-3"
                value={eventId}
                onChange={e => setEventId(e.target.value)}
              >
                <option value="">No Linked Event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.type} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-1 flex-row justify-end">
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
