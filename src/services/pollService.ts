import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface PollDetails {
  poll: {
    id: string;
    question: string;
    event: {
      title: string;
      date: string;
    } | null;
  };
  currentStatus: 'Yes' | 'No' | '';
}

export interface SingerPoll extends RecordModel {
  question: string;
  eventId?: string;
  status: 'Yes' | 'No' | '';
}

export const pollService = {
  async getPollDetails(token: string): Promise<PollDetails> {
    return await pb.send('/api/poll-details', {
      method: 'POST',
      body: { token }
    });
  },

  async submitResponse(token: string, status: 'Yes' | 'No'): Promise<{ success: boolean }> {
    return await pb.send('/api/submit-poll-response', {
      method: 'POST',
      body: { token, status }
    });
  },

  async generateTokens(pollId: string, profileIds: string[]): Promise<{ tokens: Record<string, string> }> {
    return await pb.send('/api/generate-poll-tokens', {
      method: 'POST',
      body: { pollId, profileIds }
    });
  },

  async getActivePollsForSinger(profileId: string): Promise<SingerPoll[]> {
    const [polls, responses] = await Promise.all([
      pb.collection('polls').getFullList<SingerPoll>({ sort: '-created' }),
      pb.collection('pollResponses').getFullList<RecordModel>({
        filter: pb.filter('profileId = {:profileId}', { profileId })
      })
    ]);

    const responseMap = new Map(responses.map(r => [r.pollId, r.status]));

    return polls.map(poll => ({
      ...poll,
      status: responseMap.get(poll.id) || ''
    }));
  },

  async submitResponseLoggedIn(pollId: string, profileId: string, status: 'Yes' | 'No'): Promise<void> {
    try {
      const existing = await pb.collection('pollResponses').getFirstListItem(
        pb.filter('pollId = {:pollId} && profileId = {:profileId}', { pollId, profileId })
      );
      await pb.collection('pollResponses').update(existing.id, { status });
    } catch {
      // If not found, create new
      await pb.collection('pollResponses').create({
        pollId,
        profileId,
        status
      });
    }
  }
};
