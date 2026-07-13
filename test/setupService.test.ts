import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupService } from '../src/services/setupService';
import { pb } from '../src/lib/pocketbase';

describe('setupService', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  it('getStatus sends GET request to status endpoint', async () => {
    const mockSend = mock.method(pb, 'send', async (path: string, options: { method?: string }) => {
      assert.strictEqual(path, '/api/setup/status');
      assert.strictEqual(options.method, 'GET');
      return { state: 'unclaimed', initialized: false };
    });

    const status = await setupService.getStatus();
    assert.deepStrictEqual(status, { state: 'unclaimed', initialized: false });
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('claim sends POST request to claim endpoint', async () => {
    const payload = {
      email: 'owner@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      name: 'Owner Name',
      isPerformer: true,
    };

    const mockSend = mock.method(
      pb,
      'send',
      async (path: string, options: { method?: string; body?: unknown }) => {
        assert.strictEqual(path, '/api/setup/claim');
        assert.strictEqual(options.method, 'POST');
        assert.deepStrictEqual(options.body, payload);
        return { success: true };
      }
    );

    const result = await setupService.claim(payload);
    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('saveProgress sends POST request to progress endpoint', async () => {
    const mockSend = mock.method(
      pb,
      'send',
      async (path: string, options: { method?: string; body?: unknown }) => {
        assert.strictEqual(path, '/api/setup/progress');
        assert.strictEqual(options.method, 'POST');
        assert.deepStrictEqual(options.body, {
          completedSections: ['admin-account'],
          ownerIsPerformer: true,
          ownerVoicePartSet: false,
        });
        return { success: true };
      }
    );

    const result = await setupService.saveProgress(['admin-account'], true, false);
    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('complete sends POST request to complete endpoint', async () => {
    const mockSend = mock.method(pb, 'send', async (path: string, options: { method?: string }) => {
      assert.strictEqual(path, '/api/setup/complete');
      assert.strictEqual(options.method, 'POST');
      return { success: true };
    });

    const result = await setupService.complete();
    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('recoverAdmin sends POST request to recover-admin endpoint', async () => {
    const payload = {
      email: 'newowner@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      name: 'New Owner',
    };

    const mockSend = mock.method(
      pb,
      'send',
      async (path: string, options: { method?: string; body?: unknown }) => {
        assert.strictEqual(path, '/api/setup/recover-admin');
        assert.strictEqual(options.method, 'POST');
        assert.deepStrictEqual(options.body, payload);
        return { success: true };
      }
    );

    const result = await setupService.recoverAdmin(payload);
    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('getHealth sends GET request to health endpoint', async () => {
    const mockSend = mock.method(pb, 'send', async (path: string, options: { method?: string }) => {
      assert.strictEqual(path, '/api/setup/health');
      assert.strictEqual(options.method, 'GET');
      return {
        environment: {
          appUrl: true,
          hmacSecret: true,
          maintenanceSecret: false,
          stripeSecretKey: false,
          stripeWebhookSecret: false,
        },
        stripeMode: 'unknown',
      };
    });

    const health = await setupService.getHealth();
    assert.strictEqual(health.stripeMode, 'unknown');
    assert.strictEqual(mockSend.mock.callCount(), 1);
  });

  it('counts only profiles with a performing part as singers', async () => {
    const mockSend = mock.method(pb, 'send', async () => {
      return {
        environment: {
          stripeSecretKey: false,
        },
      };
    });

    const profiles = pb.collection('profiles');
    const getList = mock.method(profiles, 'getList', async () => ({ totalItems: 0, items: [] }));

    await setupService.getReadinessSnapshot();

    assert.deepStrictEqual(getList.mock.calls[0].arguments[2], { filter: 'voicePart != ""' });
  });
});
