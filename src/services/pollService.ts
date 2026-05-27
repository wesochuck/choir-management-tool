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

export interface PollRecord extends RecordModel {
  question: string;
  eventId?: string;
  created: string;
}

export interface PollResponseRecord extends RecordModel {
  pollId: string;
  profileId: string;
  status: 'Yes' | 'No';
  expand?: {
    profileId?: {
      name: string;
      voicePart: string;
    };
  };
}

export interface PollStats {
  yes: number;
  no: number;
  volunteers: PollResponseRecord[];
  decliners: PollResponseRecord[];
}

export interface SingerPoll extends RecordModel {
  question: string;
  eventId?: string;
  status: 'Yes' | 'No' | '';
}

export const pollService = {

  async listPolls(): Promise<PollRecord[]> {
    return await pb.collection('polls').getFullList<PollRecord>({ sort: '-created' });
  },

  async listResponsesWithProfiles(): Promise<PollResponseRecord[]> {
    return await pb.collection('pollResponses').getFullList<PollResponseRecord>({
      expand: 'profileId',
      sort: '-updated',
    });
  },

  async createPoll(input: { question: string; eventId?: string }): Promise<PollRecord> {
    return await pb.collection('polls').create<PollRecord>({
      question: input.question,
      eventId: input.eventId || null,
    });
  },

  async deletePoll(id: string): Promise<void> {
    await pb.collection('polls').delete(id);
  },

  async getDashboardData(): Promise<{ polls: PollRecord[]; responses: PollResponseRecord[] }> {
    const [polls, responses] = await Promise.all([
      this.listPolls(),
      this.listResponsesWithProfiles(),
    ]);
    return { polls, responses };
  },

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
