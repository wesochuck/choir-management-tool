// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import type {
  MessageRecord,
  SendMessageInput,
} from '../../../../src/services/communicationService';
import { useDraftAutosave } from '../../../../src/views/admin/communications/useDraftAutosave';

afterEach(() => {
  mock.timers.reset();
  cleanup();
});

const input = (content: string): SendMessageInput => ({
  subject: 'Subject',
  content,
  type: 'Email',
  recipients: [],
  filters: {},
});

const record = (id: string, content: string, updated: string): MessageRecord =>
  ({
    id,
    subject: 'Subject',
    content,
    type: 'Email',
    recipients: [],
    filters: {},
    status: 'Draft',
    created: updated,
    updated,
  }) as MessageRecord;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useDraftAutosave', () => {
  it('waits 1500 ms and does not save a hydrated draft', async () => {
    mock.timers.enable();
    const persist = mock.fn(async () => record('draft-1', 'saved', '2026-07-13T12:00:00Z'));
    const { result, rerender } = renderHook(
      ({ snapshot }) =>
        useDraftAutosave({
          snapshot,
          activeDraftId: 'draft-1',
          activeDraftUpdated: '2026-07-13T11:00:00Z',
          persist,
          fetchLatest: mock.fn(),
          onSaved: mock.fn(),
          onReload: mock.fn(),
        }),
      { initialProps: { snapshot: input('saved') } }
    );

    act(() => result.current.markHydrated(record('draft-1', 'saved', '2026-07-13T11:00:00Z')));
    act(() => mock.timers.tick(1500));
    assert.equal(persist.mock.callCount(), 0);

    rerender({ snapshot: input('changed') });
    act(() => mock.timers.tick(1499));
    assert.equal(persist.mock.callCount(), 0);
    await act(async () => mock.timers.tick(1));
    assert.equal(persist.mock.callCount(), 1);
  });

  it('coalesces multiple rapid changes and saves only latest after in-flight completes', async () => {
    mock.timers.enable();
    const def = deferred<MessageRecord>();
    const persist = mock.fn(() => def.promise);

    const { result, rerender } = renderHook(
      ({ snapshot }) =>
        useDraftAutosave({
          snapshot,
          activeDraftId: 'draft-1',
          activeDraftUpdated: '2026-07-13T11:00:00Z',
          persist,
          fetchLatest: mock.fn(),
          onSaved: mock.fn(),
          onReload: mock.fn(),
        }),
      { initialProps: { snapshot: input('content1') } }
    );

    // Initial save starts after debounce
    await act(async () => {
      mock.timers.tick(1500);
    });
    assert.equal(persist.mock.callCount(), 1);
    assert.equal(result.current.status, 'saving');

    // Rapid edits during saving
    rerender({ snapshot: input('content2') });
    rerender({ snapshot: input('content3') });

    // Ticking shouldn't start new save since first is still in flight
    act(() => mock.timers.tick(1500));
    assert.equal(persist.mock.callCount(), 1);

    // Resolve first save
    const firstSaveRecord = record('draft-1', 'content1', '2026-07-13T12:00:00Z');
    const onSaved = mock.fn();
    result.current.markHydrated(firstSaveRecord); // to simulate mock updates if needed, but let's just resolve

    const secondDef = deferred<MessageRecord>();
    persist.mock.mockImplementation(() => secondDef.promise);

    await act(async () => {
      def.resolve(firstSaveRecord);
    });

    // A second save for 'content3' (latest) should be immediately triggered (since it was queued/dirty)
    assert.equal(persist.mock.callCount(), 2);
    // The second save is for 'content3'
    assert.deepEqual(persist.mock.calls[1].arguments[0].content, 'content3');

    // Clean up second save to prevent act warning
    await act(async () => {
      secondDef.resolve(record('draft-1', 'content3', '2026-07-13T12:01:00Z'));
    });
  });

  it('handles persist rejection and retries saving with retry()', async () => {
    mock.timers.enable();
    const pocketBaseError = { status: 500, message: 'Server Error' };
    const persist = mock.fn(async (): Promise<MessageRecord> => {
      throw pocketBaseError;
    });

    const { result } = renderHook(() =>
      useDraftAutosave({
        snapshot: input('content'),
        activeDraftId: 'draft-1',
        activeDraftUpdated: '2026-07-13T11:00:00Z',
        persist,
        fetchLatest: mock.fn(),
        onSaved: mock.fn(),
        onReload: mock.fn(),
      })
    );

    await act(async () => {
      mock.timers.tick(1500);
    });
    assert.equal(persist.mock.callCount(), 1);
    assert.equal(result.current.status, 'error');
    assert.equal(result.current.error, pocketBaseError);

    // Retry should trigger persist again
    const successRecord = record('draft-1', 'content', '2026-07-13T12:00:00Z');
    persist.mock.mockImplementation(async () => successRecord);

    await act(async () => {
      await result.current.retry();
    });

    assert.equal(persist.mock.callCount(), 2);
    assert.equal(result.current.status, 'saved');
    assert.equal(result.current.error, null);
  });

  it('handles background conflicts on visibility change', async () => {
    mock.timers.enable();
    const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    try {
      const initialRecord = record('draft-1', 'initial', '2026-07-13T11:00:00Z');
      const latestRecord = record('draft-1', 'newer-on-server', '2026-07-13T12:00:00Z');

      const persist = mock.fn();
      const fetchLatest = mock.fn(async () => latestRecord);
      const onSaved = mock.fn();
      let currentSnapshot = input('initial');
      const onReload = mock.fn((latest) => {
        currentSnapshot = {
          subject: latest.subject,
          content: latest.content,
          type: latest.type,
          recipients: latest.recipients,
          filters: latest.filters,
        };
      });

      const { result, rerender } = renderHook(() =>
        useDraftAutosave({
          snapshot: currentSnapshot,
          activeDraftId: 'draft-1',
          activeDraftUpdated: '2026-07-13T11:00:00Z',
          persist,
          fetchLatest,
          onSaved,
          onReload,
        })
      );

      // Hydrate first
      act(() => result.current.markHydrated(initialRecord));
      assert.equal(result.current.status, 'saved');

      // Dispatch visibilitychange
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      assert.equal(fetchLatest.mock.callCount(), 1);
      assert.equal(result.current.status, 'conflict');
      assert.equal(result.current.conflictDraft, latestRecord);

      // Reload latest
      act(() => {
        result.current.reloadLatest();
      });
      rerender();
      assert.equal(onReload.mock.callCount(), 1);
      assert.deepEqual(onReload.mock.calls[0].arguments[0], latestRecord);
      assert.equal(result.current.status, 'saved'); // markHydrated should reset status

      // Recreate conflict
      act(() => result.current.markHydrated(initialRecord));
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(result.current.status, 'conflict');

      // Save as copy
      const copiedRecord = record('draft-2', 'copied', '2026-07-13T12:05:00Z');
      persist.mock.mockImplementation(async () => copiedRecord);

      await act(async () => {
        await result.current.saveAsCopy();
      });

      assert.equal(persist.mock.callCount(), 1);
      // Persist should have been called with undefined ID (since it's a new copy)
      assert.equal(persist.mock.calls[0].arguments[1], undefined);
      assert.equal(result.current.status, 'saved');
      assert.equal(result.current.conflictDraft, null);
    } finally {
      if (originalVisibilityState) {
        Object.defineProperty(document, 'visibilityState', originalVisibilityState);
      } else {
        Object.defineProperty(document, 'visibilityState', { value: 'visible' });
      }
    }
  });

  it('prevents page unload when in unsafe states', async () => {
    const { result, rerender } = renderHook(
      ({ snapshot }) =>
        useDraftAutosave({
          snapshot,
          activeDraftId: 'draft-1',
          activeDraftUpdated: '2026-07-13T11:00:00Z',
          persist: mock.fn(),
          fetchLatest: mock.fn(),
          onSaved: mock.fn(),
          onReload: mock.fn(),
        }),
      { initialProps: { snapshot: input('saved') } }
    );

    // Hydrate to saved (safe) state
    act(() => result.current.markHydrated(record('draft-1', 'saved', '2026-07-13T11:00:00Z')));

    // Dispatch beforeunload (should be safe)
    let event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);

    // Make dirty (unsafe)
    rerender({ snapshot: input('changed') });
    assert.equal(result.current.status, 'dirty');

    // Dispatch beforeunload (should prevent)
    event = new Event('beforeunload', { cancelable: true });
    // In jsdom/browsers, event.preventDefault() sets defaultPrevented to true
    window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  });
});
