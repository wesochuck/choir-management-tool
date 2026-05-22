import type { RecordModel } from 'pocketbase';

export interface UserPreferences {
  attendanceSort?: 'lastName' | 'voicePart';
  rosterSort?: 'lastName' | 'voicePart';
  rsvpSort?: 'lastName' | 'voicePart';
}

export interface ChoirUser extends RecordModel {
  email: string;
  name: string;
  preferences?: UserPreferences;
}
