import { describe, it } from 'node:test';
import { setupService } from '../src/services/setupService';
import { pb } from '../src/lib/pocketbase';
describe('dummy', () => {
  it('test health catch', async () => {
    try {
      const res = await setupService.getHealth();
      console.log('HEALTH RETURNED:', res);
    } catch (err) {
      console.log('HEALTH THREW:', err);
    }
  });
});
