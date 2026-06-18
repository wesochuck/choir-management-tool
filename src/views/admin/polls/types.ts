import type { RecordModel } from 'pocketbase';
import type { CommunicationRecipient } from '../../../services/communicationService';

export interface PollRecord extends RecordModel {
  question: string;
  eventId?: string;
  archiveAt?: string;
  created?: string;
  updated?: string;
}

export interface PollResponseRecord extends RecordModel {
  pollId: string;
  profileId: string;
  status: 'Yes' | 'No';
  expand?: {
    profileId: {
      name: string;
      voicePart: string;
    };
  };
}

export interface PollStat {
  yes: number;
  no: number;
  volunteers: PollResponseRecord[];
  decliners: PollResponseRecord[];
}

export interface PollMessage {
  content: string;
  recipients?: CommunicationRecipient[];
}
