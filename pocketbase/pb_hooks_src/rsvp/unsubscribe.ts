import type { PocketBaseApp, PocketBaseRequestEvent } from '../email/emailTypes';
import { verifyUnsubscribeToken } from './rsvpHelpers';

declare const $app: PocketBaseApp;
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/unsubscribe', (e) => {
  // __SHARED_UTILS__

  const data = e.requestInfo().body as { [key: string]: unknown };
  const token = data.token;

  if (!token || typeof token !== 'string') {
    return e.json(400, { error: 'Missing token' });
  }

  const verification = verifyUnsubscribeToken(token);
  if (!verification.ok || !verification.data) {
    return e.json(verification.status || 400, { error: verification.error });
  }
  const parts = verification.data;

  try {
    const profile = $app.findRecordById('profiles', parts.p);
    profile.set('doNotEmail', true);
    $app.save(profile);
  } catch {
    return e.json(404, { error: 'Profile not found' });
  }

  return e.json(200, { success: true });
});
