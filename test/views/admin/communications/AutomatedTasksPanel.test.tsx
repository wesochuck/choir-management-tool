// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { AutomatedTasksPanel } from '../../../../src/views/admin/communications/AutomatedTasksPanel';
import type { AutomatedTask } from '../../../../src/views/admin/communications/types';
import type { CommunicationSettings } from '../../../../src/services/settingsService';

const baseTask: AutomatedTask = {
  id: 'task-1',
  type: 'Reminder',
  event: {
    id: 'evt-1',
    title: 'Spring Concert',
    date: new Date('2026-06-20T19:30:00').toISOString(),
    type: 'Performance',
    details: '',
  } as AutomatedTask['event'],
  scheduledTime: new Date('2026-06-18T08:00:00'),
  status: 'Scheduled',
};

const reportTask: AutomatedTask = {
  ...baseTask,
  id: 'task-2',
  type: 'Report',
};

const mockCommSettings: CommunicationSettings = {
  reminderSubjectTemplate: 'Reminder: {{EVENT_TITLE}}',
  reminderBodyTemplate: 'Dear {{SINGER_NAME}}...',
  rsvpSubjectTemplate: '',
  rsvpBodyTemplate: '',
  ticketPurchaseConfirmationSubjectTemplate: '',
  ticketPurchaseConfirmationBodyTemplate: '',
  bundleTicketPurchaseConfirmationSubjectTemplate: '',
  bundleTicketPurchaseConfirmationBodyTemplate: '',
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AutomatedTasksPanel', () => {
  it('renders action buttons for a Reminder task', () => {
    render(
      <AutomatedTasksPanel
        upcomingTasks={[baseTask]}
        onDraftTaskMessage={mock.fn()}
        onTriggerReport={mock.fn()}
        onArchiveTask={mock.fn()}
        onViewTaskRecipients={mock.fn()}
        commSettings={mockCommSettings}
        isSending={false}
      />
    );

    const archives = screen.getAllByText('Archive');
    assert.ok(archives.length > 0);
    const recipients = screen.getAllByText('Recipients');
    assert.ok(recipients.length > 0);
    const compose = screen.getAllByText('Compose');
    assert.ok(compose.length > 0);
  });

  it('renders action buttons for a Report task', () => {
    render(
      <AutomatedTasksPanel
        upcomingTasks={[reportTask]}
        onDraftTaskMessage={mock.fn()}
        onTriggerReport={mock.fn()}
        onArchiveTask={mock.fn()}
        onViewTaskRecipients={mock.fn()}
        commSettings={mockCommSettings}
        isSending={false}
      />
    );

    const archives = screen.getAllByText('Archive');
    assert.ok(archives.length > 0);
    const admins = screen.getAllByText('Admins');
    assert.ok(admins.length > 0);
    const send = screen.getAllByText('Send');
    assert.ok(send.length > 0);
  });

  it('actions column has wrapping className', () => {
    render(
      <AutomatedTasksPanel
        upcomingTasks={[baseTask]}
        onDraftTaskMessage={mock.fn()}
        onTriggerReport={mock.fn()}
        onArchiveTask={mock.fn()}
        onViewTaskRecipients={mock.fn()}
        commSettings={mockCommSettings}
        isSending={false}
      />
    );

    const ths = document.querySelectorAll('th');
    const actionsTh = [...ths].find((th) => th.textContent?.trim() === 'Actions');
    assert.ok(actionsTh);
    assert.ok(actionsTh.className.includes('w-[360px]'));
    assert.ok(actionsTh.className.includes('max-w-[360px]'));

    const tds = document.querySelectorAll('td');
    const lastTd = tds[tds.length - 1];
    assert.ok(lastTd.className.includes('whitespace-normal'));
    assert.ok(lastTd.className.includes('w-[360px]'));
    assert.ok(lastTd.className.includes('max-w-[360px]'));
  });

  it('Event Date header has hideBelow class', () => {
    render(
      <AutomatedTasksPanel
        upcomingTasks={[baseTask]}
        onDraftTaskMessage={mock.fn()}
        onTriggerReport={mock.fn()}
        onArchiveTask={mock.fn()}
        onViewTaskRecipients={mock.fn()}
        commSettings={mockCommSettings}
        isSending={false}
      />
    );

    const ths = document.querySelectorAll('th');
    const eventDateTh = [...ths].find((th) => th.textContent?.trim() === 'Event Date');
    assert.ok(eventDateTh);
    assert.ok(eventDateTh.className.includes('hidden'));
    assert.ok(eventDateTh.className.includes('xl:table-cell'));
  });
});
