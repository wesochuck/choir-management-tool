import test from 'node:test';
import assert from 'node:assert/strict';
import { pb } from '../src/lib/pocketbase.ts';
import { profileService } from '../src/services/profileService.ts';

test('profileService.getCalendarFeedUrl requests endpoint and converts to webcal with URI encoding', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async (path: string, options?: any) => {
    assert.equal(path, '/api/singer/calendar-feed-url');
    assert.equal(options?.method, 'GET');
    return { token: 'p=profile123&c=salt456&s=signature789' };
  });

  pb.send = mockSend as any;

  try {
    const feedUrl = await profileService.getCalendarFeedUrl();
    
    // Should convert http/https to webcal and URI-encode the token query param
    assert.ok(feedUrl.startsWith('webcal://'));
    assert.ok(feedUrl.includes('/api/calendar/feed?token=p%3Dprofile123%26c%3Dsalt456%26s%3Dsignature789'));
    assert.equal(mockSend.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});

test('profileService.resetCalendarFeedUrl requests reset endpoint and returns new encoded webcal link', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async (path: string, options?: any) => {
    assert.equal(path, '/api/singer/calendar-feed-url/reset');
    assert.equal(options?.method, 'POST');
    return { token: 'p=profile123&c=newSalt888&s=newSig999' };
  });

  pb.send = mockSend as any;

  try {
    const feedUrl = await profileService.resetCalendarFeedUrl();
    
    assert.ok(feedUrl.startsWith('webcal://'));
    assert.ok(feedUrl.includes('/api/calendar/feed?token=p%3Dprofile123%26c%3DnewSalt888%26s%3DnewSig999'));
    assert.equal(mockSend.mock.callCount(), 1);
  } finally {
    pb.send = originalSend;
  }
});
