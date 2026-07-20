// @vitest-environment jsdom
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '../src/lib/queryKeys.ts';
import type { Profile } from '../src/services/profileService.ts';
import type { SetListPerformerCredit } from '../src/services/eventService.ts';
import { SetListPerformerCreditsEditor } from '../src/components/admin/SetListPerformerCreditsEditor.tsx';

afterEach(() => {
  cleanup();
});

const profiles = [
  { id: 'active', name: 'Active Singer', voicePart: 'S1', globalStatus: 'Active' },
  { id: 'break', name: 'Break Singer', voicePart: 'A1', globalStatus: 'Idle' },
  { id: 'inactive', name: 'Inactive Singer', voicePart: 'T1', globalStatus: 'Inactive' },
  { id: 'admin', name: 'Admin Only', voicePart: '', globalStatus: 'Active' },
] as Profile[];

function renderEditor() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(queryKeys.profiles.list(), profiles);

  function Harness() {
    const [credits, setCredits] = useState<SetListPerformerCredit[]>([]);
    return <SetListPerformerCreditsEditor credits={credits} onChange={setCredits} isOpen />;
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>
  );
}

describe('SetListPerformerCreditsEditor', () => {
  it('includes all singer statuses, excludes profiles without a voice part, and labels Idle as On Break', () => {
    renderEditor();
    assert.ok(screen.getByRole('button', { name: /Active Singer/ }));
    assert.ok(screen.getByRole('button', { name: /Break Singer.*On Break/ }));
    assert.ok(screen.getByRole('button', { name: /Inactive Singer.*Inactive/ }));
    assert.equal(screen.queryByText('Admin Only'), null);
  });

  it('adds roster and guest credits and supports billing-order changes', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: /Active Singer/ }));
    await user.type(screen.getByLabelText('Add Guest'), 'Guest Artist');
    await user.click(screen.getByRole('button', { name: '+ Add Guest' }));

    const billingList = screen.getByRole('list', { name: 'Performer billing order' });
    assert.deepEqual(
      within(billingList)
        .getAllByRole('listitem')
        .map((row) =>
          row.textContent?.includes('Guest Artist') ? 'Guest Artist' : 'Active Singer'
        ),
      ['Active Singer', 'Guest Artist']
    );

    await user.click(screen.getByRole('button', { name: 'Move Guest Artist up' }));
    assert.deepEqual(
      within(billingList)
        .getAllByRole('listitem')
        .map((row) =>
          row.textContent?.includes('Guest Artist') ? 'Guest Artist' : 'Active Singer'
        ),
      ['Guest Artist', 'Active Singer']
    );
  });
});
