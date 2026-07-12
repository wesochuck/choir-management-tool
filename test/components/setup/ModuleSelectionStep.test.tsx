// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DialogProvider } from '../../../src/contexts/DialogProvider.tsx';
import { ModuleSelectionStep } from '../../../src/views/setup/steps/ModuleSelectionStep.tsx';
import * as moduleService from '../../../src/services/moduleService.ts';
import { setupService } from '../../../src/services/setupService.ts';

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

describe('ModuleSelectionStep', () => {
  it('does not rewrite first-run progress from permanent settings', async () => {
    const saveModules = mock.method(moduleService, 'saveModuleState', async () => undefined);
    const saveProgress = mock.method(setupService, 'saveProgress', async () => ({ success: true }));
    const refreshStatus = mock.fn(async () => undefined);
    const onSuccess = mock.fn();

    render(
      <DialogProvider>
        <ModuleSelectionStep
          initialEnabled={['roster']}
          persistSetupProgress={false}
          refreshStatus={refreshStatus}
          onSuccess={onSuccess}
        />
      </DialogProvider>
    );

    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => assert.strictEqual(saveModules.mock.callCount(), 1));
    assert.strictEqual(saveProgress.mock.callCount(), 0);
    assert.strictEqual(onSuccess.mock.callCount(), 1);
  });

  it('preserves an explicitly empty permanent module selection', async () => {
    const saveModules = mock.method(moduleService, 'saveModuleState', async () => undefined);

    render(
      <DialogProvider>
        <ModuleSelectionStep
          initialEnabled={[]}
          persistSetupProgress={false}
          refreshStatus={async () => undefined}
          onSuccess={() => undefined}
        />
      </DialogProvider>
    );

    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => assert.strictEqual(saveModules.mock.callCount(), 1));
    assert.deepStrictEqual(saveModules.mock.calls[0].arguments[0], []);
  });
});
