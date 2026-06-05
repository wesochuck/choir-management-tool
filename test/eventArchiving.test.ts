import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { eventService } from '../src/services/eventService.ts';
import { settingsService } from '../src/services/settingsService.ts';
import type { AuditionSettings } from '../src/services/settingsService.ts';
import type { Event } from '../src/services/eventService.ts';

test('deleteEvent archives performance when ticket purchases exist', async () => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;
  const originalGetAuditionSettings = settingsService.getAuditionSettings;
  const originalSaveAuditionSettings = settingsService.saveAuditionSettings;

  let updateCalled = false;
  let updatePayload: Partial<Event> | null = null;
  let deleteCalled = false;
  let rehearsalsDeleted = false;

  settingsService.getAuditionSettings = async () => ({
    enabled: true,
    slots: [],
    confirmationMessage: 'Thanks',
    defaultPerformanceId: 'perf_123',
  });

  let savedSettings: AuditionSettings | null = null;
  settingsService.saveAuditionSettings = async (settings) => {
    savedSettings = settings;
    return {} as unknown as ReturnType<typeof settingsService.saveAuditionSettings>;
  };

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return {
        getFullList: async () => [{ id: 'purchase_1', event: 'perf_123' }],
      } as unknown as ReturnType<typeof pb.collection>;
    }
    if (name === 'events') {
      return {
        getFullList: async () => [
          { id: 'rehearsal_1', parentPerformanceId: 'perf_123', type: 'Rehearsal' }
        ],
        update: async (id: string, data: Partial<Event>) => {
          assert.equal(id, 'perf_123');
          updateCalled = true;
          updatePayload = data;
          return { id, ...data } as unknown as Event;
        },
        delete: async () => {
          deleteCalled = true;
          return true;
        }
      } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        assert.equal(colName, 'events');
        return {
          delete: (id: string) => {
            assert.equal(id, 'rehearsal_1');
            rehearsalsDeleted = true;
          }
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: async () => []
    } as unknown as ReturnType<typeof pb.createBatch>;
  };

  try {
    const result = await eventService.deleteEvent('perf_123');
    assert.equal(result, true);
    assert.equal(updateCalled, true, 'Event should be updated (archived)');
    assert.ok(updatePayload);
    assert.equal(updatePayload.isArchived, true);
    assert.equal(updatePayload.isTicketingEnabled, false);
    assert.equal(updatePayload.isOpenForRSVP, false);
    assert.equal(deleteCalled, false, 'Main event should not be physically deleted');
    assert.equal(rehearsalsDeleted, true, 'Associated rehearsals should be physically deleted');
    assert.ok(savedSettings);
    assert.equal(savedSettings.defaultPerformanceId, '', 'Default performance ID should be cleared');
    assert.equal(savedSettings.enabled, false, 'Auditions should be disabled');
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
    settingsService.getAuditionSettings = originalGetAuditionSettings;
    settingsService.saveAuditionSettings = originalSaveAuditionSettings;
  }
});

test('deleteEvent physically deletes performance when no ticket purchases exist', async () => {
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;
  const originalGetAuditionSettings = settingsService.getAuditionSettings;
  const originalSaveAuditionSettings = settingsService.saveAuditionSettings;

  let updateCalled = false;
  let deleteCalled = false;
  let rehearsalsDeleted = false;

  settingsService.getAuditionSettings = async () => ({
    enabled: true,
    slots: [],
    confirmationMessage: 'Thanks',
    defaultPerformanceId: 'other_perf',
  });

  let savedSettingsCalled = false;
  settingsService.saveAuditionSettings = async () => {
    savedSettingsCalled = true;
    return {} as unknown as ReturnType<typeof settingsService.saveAuditionSettings>;
  };

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return {
        getFullList: async () => [],
      } as unknown as ReturnType<typeof pb.collection>;
    }
    if (name === 'events') {
      return {
        getFullList: async () => [
          { id: 'rehearsal_1', parentPerformanceId: 'perf_123', type: 'Rehearsal' }
        ],
        update: async (id: string, data: Partial<Event>) => {
          updateCalled = true;
          return { id, ...data } as unknown as Event;
        },
        delete: async (id: string) => {
          if (id === 'perf_123') {
            deleteCalled = true;
          }
          return true;
        }
      } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        assert.equal(colName, 'events');
        return {
          delete: (id: string) => {
            assert.equal(id, 'rehearsal_1');
            rehearsalsDeleted = true;
          }
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: async () => []
    } as unknown as ReturnType<typeof pb.createBatch>;
  };

  try {
    const result = await eventService.deleteEvent('perf_123');
    assert.equal(result, true);
    assert.equal(updateCalled, false, 'Event should not be updated (archived)');
    assert.equal(deleteCalled, true, 'Main event should be physically deleted');
    assert.equal(rehearsalsDeleted, true, 'Associated rehearsals should be physically deleted');
    assert.equal(savedSettingsCalled, false, 'Audition settings should not be saved or changed');
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
    settingsService.getAuditionSettings = originalGetAuditionSettings;
    settingsService.saveAuditionSettings = originalSaveAuditionSettings;
  }
});
