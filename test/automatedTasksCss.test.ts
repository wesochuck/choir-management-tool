import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('../src/views/admin/communications/AutomatedTasksPanel.tsx', import.meta.url), 'utf8');
const commView = readFileSync(new URL('../src/views/admin/CommunicationView.tsx', import.meta.url), 'utf8');

test('AutomatedTasksPanel uses Tailwind grid layout', () => {
  assert.match(panel, /grid/, 'should use Tailwind grid');
  assert.match(panel, /md:grid-cols-2/, 'should have responsive grid columns');
});

test('AutomatedTasksPanel uses card component for task items', () => {
  assert.match(panel, /card/, 'should use card class');
  assert.match(panel, /gap-/, 'should use Tailwind gap utilities');
});

test('CommunicationView references AutomatedTasksPanel component', () => {
  assert.match(commView, /AutomatedTasksPanel/, 'should import AutomatedTasksPanel');
  assert.match(commView, /useAutomatedCommunicationTasks/, 'should use automated tasks hook');
});
