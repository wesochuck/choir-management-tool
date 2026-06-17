import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { Modal, Button, Select, Input } from '../ui';
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
  const [isCreating, setIsCreating] = useState(false);
  const { events } = useEvents();

  // Create form state
  const [question, setQuestion] = useState('');
  const [eventId, setEventId] = useState('');

  const { data: polls = [], isLoading } = useQuery({
    queryKey: queryKeys.polls.list,
    queryFn: () => pb.collection('polls').getFullList<PollRecord>({ sort: '-created' }),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: { question: string; eventId: string | null }) =>
      pb.collection('polls').create<PollRecord>(data),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setIsCreating(true);
    try {
      const record = await createMutation.mutateAsync({
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Insert a Poll"
      maxWidth="500px"
    >

      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-1 border-b border-border pb-1">
          <Button
            size="small"
            variant={tab === 'list' ? 'primary' : 'outline'}
            onClick={() => setTab('list')}
          >
            Existing Polls
          </Button>
          <Button
            size="small"
            variant={tab === 'create' ? 'primary' : 'outline'}
            onClick={() => setTab('create')}
          >
            Create New Poll
          </Button>
        </div>

        {tab === 'list' ? (
          <div className="flex flex-col gap-2">
            <div className="max-h-[400px] flex flex-col gap-2 overflow-y-auto">
              {isLoading ? (
                <p className="text-muted p-4 text-center">Loading polls...</p>
              ) : polls.length === 0 ? (
                <p className="text-muted p-4 text-center">No polls found. Create one to get started!</p>
              ) : (
                polls.map(poll => (
                  <button
                    key={poll.id}
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border border-border bg-surface p-3 px-4 text-left shadow-sm transition-all duration-200 hover:bg-bg"
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
            <div className="mt-1 flex flex-row justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label">Poll Question</label>
              <Input
                
                autoFocus
                required
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g. Can you help with riser setup?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-label">Linked Event (Optional)</label>
              <Select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
              >
                <option value="">No Linked Event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.type} ({new Date(event.date).toLocaleDateString()})
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-1 flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={isCreating || !question} loading={isCreating}>
                Create & Insert Poll
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
