// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useCommunicationProviderSettings } from '../../../../src/views/admin/communications/useCommunicationProviderSettings';

afterEach(() => cleanup());

describe('useCommunicationProviderSettings', () => {
  it('preserves unsaved provider edits when query data refetches', async () => {
    const { result, rerender } = renderHook(
      ({ provider, brevoApiKey }) => useCommunicationProviderSettings({ provider, brevoApiKey }),
      {
        initialProps: { provider: 'smtp' as const, brevoApiKey: 'initial-key' },
      }
    );

    await waitFor(() => assert.equal(result.current.brevoApiKey, 'initial-key'));

    act(() => {
      result.current.setEmailProvider('brevo');
      result.current.setBrevoApiKey('unsaved-key');
    });

    rerender({ provider: 'smtp' as const, brevoApiKey: 'background-refetch-key' });

    assert.equal(result.current.emailProvider, 'brevo');
    assert.equal(result.current.brevoApiKey, 'unsaved-key');
  });
});
