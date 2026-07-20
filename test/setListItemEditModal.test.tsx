// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DialogContext, type DialogContextValue } from '../src/contexts/DialogContext.tsx';
import { queryKeys } from '../src/lib/queryKeys.ts';
import type { SetListItem } from '../src/services/eventService.ts';
import { SetListItemEditModal } from '../src/components/admin/SetListItemEditModal.tsx';

afterEach(() => {
  cleanup();
});

function renderModal(
  item: SetListItem,
  onSave: (saved: SetListItem) => void,
  confirm: DialogContextValue['confirm'] = async () => true
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(queryKeys.profiles.list(), []);
  const dialog: DialogContextValue = {
    confirm,
    showMessage: async () => {},
    prompt: async () => null,
    showToast: () => {},
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <DialogContext.Provider value={dialog}>
        <SetListItemEditModal isOpen item={item} onClose={() => {}} onSave={onSave} />
      </DialogContext.Provider>
    </QueryClientProvider>
  );
}

describe('SetListItemEditModal featured performers', () => {
  it('saves a legacy flag as a featured TBA item in the new shape', async () => {
    const saved: SetListItem[] = [];
    renderModal(
      { id: 'legacy', title: 'Legacy Solo', type: 'song', soloSmallGroup: true },
      (item) => saved.push(item)
    );
    assert.ok(screen.getByRole('heading', { name: 'Set List Details' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Set List Details' }));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].isFeaturedNumber, true);
    assert.deepEqual(saved[0].performerCredits, []);
    assert.equal(saved[0].soloSmallGroup, undefined);
  });

  it('confirms and clears credits when specific performer assignments are turned off', async () => {
    const saved: SetListItem[] = [];
    const confirm = mock.fn(async () => true);
    renderModal(
      {
        id: 'featured',
        title: 'Current Solo',
        type: 'song',
        isFeaturedNumber: true,
        performerCredits: [{ kind: 'profile', profileId: 'profile-1', displayName: 'Singer Name' }],
      },
      (item) => saved.push(item),
      confirm
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Assign specific performers' }));
    assert.equal(confirm.mock.callCount(), 1);
    await userEvent.click(screen.getByRole('button', { name: 'Save Set List Details' }));
    assert.equal(saved[0].isFeaturedNumber, false);
    assert.deepEqual(saved[0].performerCredits, []);
  });
});
