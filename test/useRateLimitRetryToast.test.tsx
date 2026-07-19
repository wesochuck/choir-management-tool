// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useRateLimitRetryToast } from '../src/hooks/useRateLimitRetryToast';
import { DialogContext, type DialogContextValue } from '../src/contexts/DialogContext';

function createWrapper(dialogValue: DialogContextValue) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DialogContext.Provider value={dialogValue}>{children}</DialogContext.Provider>;
  };
}

describe('useRateLimitRetryToast', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('provides onRetry and reset functions', () => {
    const mockDialog: DialogContextValue = {
      showMessage: async () => {},
      confirm: async () => true,
      prompt: async () => null,
      showToast: mock.fn(),
    };

    const { result } = renderHook(() => useRateLimitRetryToast('Please wait'), {
      wrapper: createWrapper(mockDialog),
    });

    assert.equal(typeof result.current.onRetry, 'function');
    assert.equal(typeof result.current.reset, 'function');
  });

  it('calls dialog.showToast with the provided message on retry', () => {
    const showToastMock = mock.fn();
    const mockDialog: DialogContextValue = {
      showMessage: async () => {},
      confirm: async () => true,
      prompt: async () => null,
      showToast: showToastMock,
    };

    const { result } = renderHook(() => useRateLimitRetryToast('Rate limited'), {
      wrapper: createWrapper(mockDialog),
    });

    result.current.onRetry({
      retryAfterMs: 1000,
      retryCount: 1,
    });

    assert.equal(showToastMock.mock.callCount(), 1);
    assert.deepEqual(showToastMock.mock.calls[0].arguments, ['Rate limited']);
  });

  it('only shows the toast once until reset is called', () => {
    const showToastMock = mock.fn();
    const mockDialog: DialogContextValue = {
      showMessage: async () => {},
      confirm: async () => true,
      prompt: async () => null,
      showToast: showToastMock,
    };

    const { result } = renderHook(() => useRateLimitRetryToast('Rate limited'), {
      wrapper: createWrapper(mockDialog),
    });

    // Call first time
    result.current.onRetry({
      retryAfterMs: 1000,
      retryCount: 1,
    });

    assert.equal(showToastMock.mock.callCount(), 1);

    // Call second time, should not trigger another toast
    result.current.onRetry({
      retryAfterMs: 2000,
      retryCount: 2,
    });

    assert.equal(showToastMock.mock.callCount(), 1);

    // Call reset
    result.current.reset();

    // Call third time, should trigger toast again
    result.current.onRetry({
      retryAfterMs: 3000,
      retryCount: 3,
    });

    assert.equal(showToastMock.mock.callCount(), 2);
  });

  it('updates the message and showToast reference dynamically', () => {
    const showToastMock1 = mock.fn();
    const showToastMock2 = mock.fn();

    let currentDialog: DialogContextValue = {
      showMessage: async () => {},
      confirm: async () => true,
      prompt: async () => null,
      showToast: showToastMock1,
    };

    // Make wrapper use the variable to provide updated context value
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DialogContext.Provider value={currentDialog}>{children}</DialogContext.Provider>
    );

    const { result, rerender } = renderHook(
      ({ message }) => {
        return useRateLimitRetryToast(message);
      },
      {
        initialProps: { message: 'Message 1' },
        wrapper
      }
    );

    // Initial state check
    result.current.onRetry({ retryAfterMs: 1000, retryCount: 1 });
    assert.equal(showToastMock1.mock.callCount(), 1);
    assert.deepEqual(showToastMock1.mock.calls[0].arguments, ['Message 1']);

    // Reset state before rerendering
    result.current.reset();

    // Update context value variable and rerender with new message
    currentDialog = {
      showMessage: async () => {},
      confirm: async () => true,
      prompt: async () => null,
      showToast: showToastMock2,
    };

    rerender({ message: 'Message 2' });

    // Verify it uses the updated message and updated showToast function
    result.current.onRetry({ retryAfterMs: 1000, retryCount: 1 });

    assert.equal(showToastMock2.mock.callCount(), 1);
    assert.deepEqual(showToastMock2.mock.calls[0].arguments, ['Message 2']);

    // Original mock shouldn't have been called again
    assert.equal(showToastMock1.mock.callCount(), 1);
  });
});
