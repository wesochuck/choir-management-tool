// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DialogProvider } from '../../../src/contexts/DialogProvider';
import { SetupProvider } from '../../../src/contexts/SetupContext';
import { OrganizationBasicsStep } from '../../../src/views/setup/steps/OrganizationBasicsStep';
import { RosterStructureStep } from '../../../src/views/setup/steps/RosterStructureStep';
import { settingsService } from '../../../src/services/settingsService';
import { setupService } from '../../../src/services/setupService';

afterEach(() => {
  document.body.innerHTML = '';
  mock.restoreAll();
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('Organization & Roster Presets Steps', () => {
  it('OrganizationBasicsStep renders fields and submits inputs', async () => {
    const saveNameMock = mock.method(settingsService, 'saveChoirName', async () => {});
    const saveTzMock = mock.method(settingsService, 'saveTimezone', async () => {});
    const saveUrlMock = mock.method(settingsService, 'saveHomepageUrl', async () => {});
    const progressMock = mock.method(setupService, 'saveProgress', async () => ({ success: true }));

    const onSuccess = mock.fn();
    const refreshStatus = mock.fn(async () => {});

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <DialogProvider>
            <OrganizationBasicsStep onSuccess={onSuccess} refreshStatus={refreshStatus} />
          </DialogProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    const nameInput = screen.getByPlaceholderText(
      'Metropolitan Community Choir'
    ) as HTMLInputElement;
    const urlInput = screen.getByPlaceholderText('https://www.ourchoir.org') as HTMLInputElement;

    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Test Choir' } });
      fireEvent.change(urlInput, { target: { value: 'https://testchoir.org' } });
    });

    const submitBtn = screen.getByText(/Save & Continue/i);
    act(() => {
      submitBtn.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(saveNameMock.mock.callCount(), 1);
    assert.strictEqual(saveNameMock.mock.calls[0].arguments[0], 'Test Choir');
    assert.strictEqual(progressMock.mock.callCount(), 1);
    assert.deepStrictEqual(progressMock.mock.calls[0].arguments[0], [
      'admin-account',
      'organization-basics',
    ]);
  });

  it('RosterStructureStep renders options and submits selected preset', async () => {
    const saveVoicePartsMock = mock.method(
      settingsService,
      'saveVoicePartsAndSections',
      async () => {}
    );
    const progressMock = mock.method(setupService, 'saveProgress', async () => ({ success: true }));

    const onSuccess = mock.fn();
    const refreshStatus = mock.fn(async () => {});

    render(
      <QueryClientProvider client={createQueryClient()}>
        <SetupProvider>
          <DialogProvider>
            <RosterStructureStep onSuccess={onSuccess} refreshStatus={refreshStatus} />
          </DialogProvider>
        </SetupProvider>
      </QueryClientProvider>
    );

    // Renders presets cards
    assert.ok(screen.getByText(/SATB/i));
    assert.ok(screen.getByText(/SSAA/i));
    assert.ok(screen.getByText(/TTBB/i));

    // Choose SSAA and submit
    const ssaaCard = screen.getByText(/SSAA/i).closest('button');
    assert.ok(ssaaCard);
    act(() => {
      ssaaCard.click();
    });

    const submitBtn = screen.getByText(/Save & Continue/i);
    act(() => {
      submitBtn.click();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(saveVoicePartsMock.mock.callCount(), 1);
    const configPassed = saveVoicePartsMock.mock.calls[0].arguments[0];
    assert.ok(configPassed.sections.some((s: any) => s.code === 'S'));
    assert.ok(configPassed.sections.some((s: any) => s.code === 'A'));
    assert.ok(!configPassed.sections.some((s: any) => s.code === 'T')); // SSAA has no Tenors

    assert.strictEqual(progressMock.mock.callCount(), 1);
  });
});
