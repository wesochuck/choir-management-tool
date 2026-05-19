import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { exportToCSV, updateProfilePhoto } from '../src/services/profileService.ts';

test('exportToCSV maps profiles to CSV format correctly', () => {
  const profiles = [{ id: '1', name: 'John Doe', email: 'john@example.com', phone: '123', voicePart: 'T1', globalStatus: 'Active' }];
  const csv = exportToCSV(profiles);
  assert.ok(csv.includes('Name,Email,Phone,Voice Part,Status'));
  assert.ok(csv.includes('"John Doe","john@example.com","123","T1","Active"'));
});

test('updateProfilePhoto calls pocketbase with FormData', async (t) => {
  const originalCollection = pb.collection;
  const mockUpdate = t.mock.fn(async (id: string, data: any) => {
    return { id, photo: 'photo.jpg' };
  });

  pb.collection = function (name: string) {
    if (name === 'profiles') {
      return { update: mockUpdate } as any;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const formData = new FormData();
    formData.append('photo', new Blob(['test'], { type: 'image/jpeg' }));
    
    const result = await updateProfilePhoto('1', formData);
    
    assert.equal(result.photo, 'photo.jpg');
    assert.equal(mockUpdate.mock.callCount(), 1);
    const firstCall = mockUpdate.mock.calls[0];
    assert.equal(firstCall.arguments[0], '1');
    assert.equal(firstCall.arguments[1], formData);
  } finally {
    pb.collection = originalCollection;
  }
});

test('in-memory profile name filtering works case-insensitively', () => {
  const profiles = [
    { id: '1', name: 'Alice Smith', voicePart: 'S1', globalStatus: 'Active' },
    { id: '2', name: 'Bob Johnson', voicePart: 'B1', globalStatus: 'Active' },
    { id: '3', name: 'Charlie Miller', voicePart: 'T1', globalStatus: 'Inactive' }
  ];

  const filterName = (list: any[], query: string) => {
    return list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  };

  const match1 = filterName(profiles, 'alice');
  assert.equal(match1.length, 1);
  assert.equal(match1[0].id, '1');

  const match2 = filterName(profiles, 'JOHN');
  assert.equal(match2.length, 1);
  assert.equal(match2[0].id, '2');

  const match3 = filterName(profiles, 'mi');
  assert.equal(match3.length, 2);
});
