import { pb } from '../pocketbase';

export const queueSettingsService = {
  async getSettings(): Promise<{ secret: string }> {
    return pb.send('/api/admin/queue-settings', { method: 'GET' });
  },

  async generateToken(): Promise<{ secret: string }> {
    return pb.send('/api/admin/queue-settings/generate', { method: 'POST' });
  },
};
