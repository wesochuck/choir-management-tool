import test from 'node:test';
import assert from 'node:assert/strict';
import { exportToCSV } from '../src/services/profileService.ts';

test('exportToCSV maps profiles to CSV format correctly', () => {
  const profiles = [{ id: '1', name: 'John Doe', email: 'john@example.com', phone: '123', voicePart: 'T1', globalStatus: 'Active' }];
  const csv = exportToCSV(profiles);
  assert.ok(csv.includes('Name,Email,Phone,Voice Part,Status'));
  assert.ok(csv.includes('"John Doe","john@example.com","123","T1","Active"'));
});
