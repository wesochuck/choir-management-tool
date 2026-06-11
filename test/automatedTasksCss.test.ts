import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('../src/views/admin/communications/AutomatedTasksPanel.tsx', import.meta.url), 'utf8');
const commView = readFileSync(new URL('../src/views/admin/CommunicationView.tsx', import.meta.url), 'utf8');

test('AutomatedTasksPanel uses Tailwind table layout', () => {
  assert.match(panel, /table/, 'should use table');
  assert.match(panel, /border-collapse/, 'should use border-collapse');
});

test('AutomatedTasksPanel uses row components for task items', () => {
  assert.match(panel, /tr/, 'should use tr elements');
  assert.match(panel, /gap-/, 'should use Tailwind gap utilities');
});

test('CommunicationView references AutomatedTasksPanel component', () => {
  assert.match(commView, /AutomatedTasksPanel/, 'should import AutomatedTasksPanel');
  assert.match(commView, /useAutomatedCommunicationTasks/, 'should use automated tasks hook');
});
