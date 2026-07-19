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

    fireEvent.submit(screen.getByText(/Select the features you want to enable/i).closest('form')!);

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

    fireEvent.submit(screen.getByText(/Select the features you want to enable/i).closest('form')!);

    await waitFor(() => assert.strictEqual(saveModules.mock.callCount(), 1));
    assert.deepStrictEqual(saveModules.mock.calls[0].arguments[0], []);
  });

  it('does not allow a performer owner to disable the roster module', async () => {
    const saveModules = mock.method(moduleService, 'saveModuleState', async () => undefined);

    render(
      <DialogProvider>
        <ModuleSelectionStep
          initialEnabled={['roster']}
          requiredModules={['roster']}
          persistSetupProgress={false}
          refreshStatus={async () => undefined}
          onSuccess={() => undefined}
        />
      </DialogProvider>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    assert.strictEqual((checkboxes[0] as HTMLInputElement).checked, true);
    assert.strictEqual(saveModules.mock.callCount(), 0);
  });

  it('adds required modules when resuming with an incomplete module state', () => {
    render(
      <DialogProvider>
        <ModuleSelectionStep
          initialEnabled={['events']}
          requiredModules={['roster']}
          persistSetupProgress={false}
          refreshStatus={async () => undefined}
          onSuccess={() => undefined}
        />
      </DialogProvider>
    );

    const labels = screen.getAllByRole('checkbox') as HTMLInputElement[];
    assert.ok(labels.some((checkbox) => checkbox.checked));
  });
});
