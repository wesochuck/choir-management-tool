import test, { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { duesService } from '../src/services/duesService';
import { pb } from '../src/lib/pocketbase';

// We mock the `pb` object via Node's mock functions. 
// Since `pb` is imported directly into `duesService`, we need to mock its methods before tests run.

describe('duesService', () => {
  let mockCollection: any;

  beforeEach(() => {
    mock.restoreAll();
    
    mockCollection = {
      getFullList: mock.fn(),
      getFirstListItem: mock.fn(),
      update: mock.fn(),
      create: mock.fn(),
    };
    
    mock.method(pb, 'collection', () => mockCollection);
    mock.method(pb, 'filter', (str: string, params: any) => {
      let res = str;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          res = res.replace(`{:${k}}`, `'${v}'`);
        }
      }
      return res;
    });
  });

  describe('getDuesForSeason', () => {
    it('returns empty array if season is falsy', async () => {
      const result = await duesService.getDuesForSeason('');
      assert.deepStrictEqual(result, []);
      assert.strictEqual((pb.collection as any).mock.callCount(), 0);
    });

    it('queries seasonalDues for the given season', async () => {
      const mockDues = [{ id: '1', season: 'Fall 2026', paid: true }];
      mockCollection.getFullList.mock.mockImplementation(async () => mockDues);

      const result = await duesService.getDuesForSeason('Fall 2026');
      
      assert.strictEqual((pb.collection as any).mock.calls[0].arguments[0], 'seasonalDues');
      assert.deepStrictEqual(mockCollection.getFullList.mock.calls[0].arguments[0], {
        filter: "season = 'Fall 2026'"
      });
      assert.deepStrictEqual(result, mockDues);
    });
  });

  describe('updateDues', () => {
    it('updates existing record if found', async () => {
      mockCollection.getFirstListItem.mock.mockImplementation(async () => ({ id: 'existing_id' }));
      mockCollection.update.mock.mockImplementation(async () => ({ id: 'existing_id', paid: true }));

      const result = await duesService.updateDues('prof1', 'Fall 2026', true);

      assert.strictEqual(
        mockCollection.getFirstListItem.mock.calls[0].arguments[0],
        "profile = 'prof1' && season = 'Fall 2026'"
      );
      assert.deepStrictEqual(mockCollection.update.mock.calls[0].arguments, ['existing_id', { paid: true }]);
      assert.strictEqual(mockCollection.create.mock.callCount(), 0);
      assert.deepStrictEqual(result, { id: 'existing_id', paid: true });
    });

    it('creates new record if existing not found (404)', async () => {
      const notFoundError: any = new Error('Not found');
      notFoundError.status = 404;
      mockCollection.getFirstListItem.mock.mockImplementation(async () => Promise.reject(notFoundError));
      
      const createdRecord = { id: 'new_id', profile: 'prof1', season: 'Fall 2026', paid: true };
      mockCollection.create.mock.mockImplementation(async () => createdRecord);

      const result = await duesService.updateDues('prof1', 'Fall 2026', true);

      assert.strictEqual(mockCollection.getFirstListItem.mock.callCount(), 1);
      assert.deepStrictEqual(mockCollection.create.mock.calls[0].arguments[0], {
        profile: 'prof1',
        season: 'Fall 2026',
        paid: true
      });
      assert.strictEqual(mockCollection.update.mock.callCount(), 0);
      assert.deepStrictEqual(result, createdRecord);
    });

    it('re-throws error if not 404', async () => {
      const otherError: any = new Error('Server error');
      otherError.status = 500;
      mockCollection.getFirstListItem.mock.mockImplementation(async () => Promise.reject(otherError));
      
      await assert.rejects(
        () => duesService.updateDues('prof1', 'Fall 2026', true),
        /Server error/
      );
      assert.strictEqual(mockCollection.create.mock.callCount(), 0);
    });
  });
});
