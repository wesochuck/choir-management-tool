// @vitest-environment jsdom
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { communicationService } from '../../../../src/services/communicationService';
import { useDeliverySummaries } from '../../../../src/views/admin/communications/useDeliverySummaries';
import type { DeliverySummaryResponse } from '../../../../src/services/communicationService';

const sent: DeliverySummaryResponse = {
  summaries: {
    m1: {
      messageId: 'm1',
      state: 'sent',
      total: { total: 5, pending: 0, processing: 0, sent: 5, failed: 0 },
      email: { total: 5, pending: 0, processing: 0, sent: 5, failed: 0 },
      sms: { total: 0, pending: 0, processing: 0, sent: 0, failed: 0 },
      failures: [],
      hasMoreFailures: false,
      lastActivity: '2026-07-13T12:00:00Z',
      truncated: false,
    },
  },
};

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useDeliverySummaries', () => {
  afterEach(() => {
    cleanup();
    mock.restoreAll();
  });

  it('returns empty summaries when messageIds is empty', async () => {
    const getSummariesSpy = mock.method(
      communicationService,
      'getDeliverySummaries',
      async () => sent
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDeliverySummaries([]), {
      wrapper: wrapper(queryClient),
    });
    assert.deepStrictEqual(result.current.summaries, {});
    assert.equal(result.current.isLoading, false);
    assert.equal(getSummariesSpy.mock.callCount(), 0, 'Should not fetch when no IDs provided');
  });

  it('fetches summaries when messageIds are provided', async () => {
    const getSummariesSpy = mock.method(
      communicationService,
      'getDeliverySummaries',
      async () => sent
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDeliverySummaries(['m1']), {
      wrapper: wrapper(queryClient),
    });

    // Wait for async query to settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    assert.ok(getSummariesSpy.mock.callCount() >= 1, 'Should have fetched summaries');
    assert.deepStrictEqual(result.current.summaries, sent.summaries);
  });

  it('exposes retry mutation', async () => {
    mock.method(communicationService, 'getDeliverySummaries', async () => sent);
    const retryMock = mock.method(communicationService, 'retryFailedDeliveries', async () => ({
      retriedCount: 2,
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useDeliverySummaries(['m1']), {
      wrapper: wrapper(queryClient),
    });

    await act(async () => {
      await result.current.retryFailed('m1');
    });

    assert.equal(retryMock.mock.callCount(), 1);
    assert.deepStrictEqual(retryMock.mock.calls[0]?.arguments, ['m1']);
  });
});
