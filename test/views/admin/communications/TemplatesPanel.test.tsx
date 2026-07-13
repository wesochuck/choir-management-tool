// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type EasyMDE from 'easymde';

import { TemplatesPanel } from '../../../../src/views/admin/communications/TemplatesPanel';
import {
  communicationService,
  type TemplateRecord,
} from '../../../../src/services/communicationService';

type DialogApi = ReturnType<(typeof import('../../../../src/contexts/DialogContext'))['useDialog']>;

afterEach(() => {
  cleanup();
  mock.restoreAll();
});

describe('TemplatesPanel', () => {
  it('associates template editor labels with their controls', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const editingTemplate: Partial<TemplateRecord> = {
      title: 'Reminder',
      type: 'Email',
      subject: 'Rehearsal reminder',
      content: 'Remember rehearsal tonight.',
    };
    const dialog = {
      confirm: async () => true,
      showMessage: async () => {},
      showToast: () => {},
      prompt: async () => '',
    } as unknown as DialogApi;

    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesPanel
          templates={[]}
          setTemplates={
            mock.fn() as unknown as React.Dispatch<React.SetStateAction<TemplateRecord[]>>
          }
          editingTemplate={editingTemplate}
          setEditingTemplate={
            mock.fn() as unknown as React.Dispatch<
              React.SetStateAction<Partial<TemplateRecord> | null>
            >
          }
          dialog={dialog}
          previewHtml="<p>Preview</p>"
          onInsertPlaceholder={mock.fn()}
          editorRef={{ current: null } as React.MutableRefObject<EasyMDE | null>}
          choirName="Test Choir"
          senderEmail="sender@example.com"
        />
      </QueryClientProvider>
    );

    assert.ok(screen.getByLabelText('Template Title'));
    assert.ok(screen.getByLabelText('Channel'));
    assert.ok(screen.getByLabelText('Subject'));
    assert.ok(screen.getByLabelText('Template Body (Markdown Supported)'));
    assert.equal(
      screen.getByRole('button', { name: 'Desktop' }).getAttribute('aria-pressed'),
      'true'
    );
    assert.equal(
      screen.getByRole('button', { name: 'Mobile' }).getAttribute('aria-pressed'),
      'false'
    );
  });

  it('preserves PocketBase validation details when a template save fails', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const showMessage = mock.fn(async () => {});
    const dialog = {
      confirm: async () => true,
      showMessage,
      showToast: () => {},
      prompt: async () => '',
    } as unknown as DialogApi;

    mock.method(communicationService, 'saveTemplate', async () => {
      throw {
        response: {
          data: {
            title: { code: 'validation_required', message: 'Required.' },
          },
        },
      };
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TemplatesPanel
          templates={[]}
          setTemplates={
            mock.fn() as unknown as React.Dispatch<React.SetStateAction<TemplateRecord[]>>
          }
          editingTemplate={{
            title: 'Reminder',
            type: 'Email',
            subject: 'Rehearsal reminder',
            content: 'Remember rehearsal tonight.',
          }}
          setEditingTemplate={
            mock.fn() as unknown as React.Dispatch<
              React.SetStateAction<Partial<TemplateRecord> | null>
            >
          }
          dialog={dialog}
          previewHtml="<p>Preview</p>"
          onInsertPlaceholder={mock.fn()}
          editorRef={{ current: null } as React.MutableRefObject<EasyMDE | null>}
          choirName="Test Choir"
          senderEmail="sender@example.com"
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

    await waitFor(() => assert.equal(showMessage.mock.callCount(), 1));
    assert.equal(showMessage.mock.calls[0]?.arguments[0].message, 'Title is required.');
  });
});
