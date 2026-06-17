import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const panel = readFileSync(
  resolve(process.cwd(), 'src/views/admin/communications/AutomatedTasksPanel.tsx'),
  'utf8'
);
const commView = readFileSync(
  resolve(process.cwd(), 'src/views/admin/CommunicationView.tsx'),
  'utf8'
);

test('AutomatedTasksPanel uses DataTable', () => {
  assert.match(panel, /DataTable/, 'should use DataTable');
});

test('AutomatedTasksPanel imports DataTable and ColumnDef', () => {
  assert.match(panel, /DataTable[\s\S]*ColumnDef/, 'should import DataTable and ColumnDef');
});

test('AutomatedTasksPanel defines columns with id and header', () => {
  assert.match(panel, /id: 'date',\s*header: 'Date'/, 'should have Date column');
  assert.match(panel, /id: 'type',\s*header: 'Type'/, 'should have Type column');
  assert.match(panel, /id: 'event',\s*header: 'Event'/, 'should have Event column');
  assert.match(panel, /id: 'eventDate',\s*header: 'Event Date'/, 'should have Event Date column');
  assert.match(panel, /id: 'status',\s*header: 'Status'/, 'should have Status column');
  assert.match(panel, /id: 'actions',\s*header: 'Actions'/, 'should have Actions column');
});

test('CommunicationView references AutomatedTasksPanel component', () => {
  assert.match(commView, /AutomatedTasksPanel/, 'should import AutomatedTasksPanel');
  assert.match(commView, /useAutomatedCommunicationTasks/, 'should use automated tasks hook');
});
