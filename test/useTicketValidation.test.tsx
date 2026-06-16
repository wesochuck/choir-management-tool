// @vitest-environment jsdom
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useValidateScan, useScanContext } from '../src/hooks/useTicketValidation';
import { ticketService } from '../src/services/ticketService';
import { mock } from 'node:test';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useTicketValidation', () => {
  it('useValidateScan returns a mutation object', () => {
    const { result } = renderHook(() => useValidateScan(), { wrapper: createWrapper() });
    assert.equal(typeof result.current.mutate, 'function');
    assert.equal(typeof result.current.mutateAsync, 'function');
  });

  it('useValidateScan calls ticketService.validateScan on mutate', async () => {
    const validateScan = mock.method(ticketService, 'validateScan', async () => ({
      valid: true,
      buyerName: 'Jane Doe',
      quantity: 2,
      eventId: 'evt_1',
      eventTitle: 'Spring Concert',
      eventDate: '2026-05-15T19:30:00Z',
      isBundlePass: false,
    }));

    const { result } = renderHook(() => useValidateScan(), { wrapper: createWrapper() });

    await act(async () => {
      const res = await result.current.mutateAsync({ token: 'tok_1', eventId: 'evt_1' });
      assert.equal(res.valid, true);
      assert.equal(res.buyerName, 'Jane Doe');
    });

    assert.equal(validateScan.mock.callCount(), 1);
    assert.deepEqual(validateScan.mock.calls[0].arguments, ['tok_1', 'evt_1']);
  });

  it('useScanContext returns enabled=false when args are null', () => {
    const { result } = renderHook(() => useScanContext(null, null), { wrapper: createWrapper() });
    assert.equal(result.current.data, undefined);
    assert.equal(result.current.isLoading, false);
    assert.equal(result.current.fetchStatus, 'idle');
  });

  it('useScanContext fetches data when both args are provided', async () => {
    const getScanContext = mock.method(ticketService, 'getScanContext', async () => ({
      token: 't=pur_1&s=sig',
      qrDataUri: 'data:image/svg+xml,...',
      buyerName: 'Jane Doe',
      eventTitle: 'Spring Concert',
      eventDate: '2026-05-15T19:30:00Z',
      isBundlePass: false,
    }));

    const { result } = renderHook(() => useScanContext('sess_1', 'pur_1'), { wrapper: createWrapper() });

    assert.equal(result.current.isLoading, true);

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
    });

    assert.equal(result.current.data?.token, 't=pur_1&s=sig');
    assert.equal(getScanContext.mock.callCount(), 1);
    assert.deepEqual(getScanContext.mock.calls[0].arguments, ['sess_1', 'pur_1']);
  });
});
