import type { PocketBaseApp, PocketBaseRequestEvent } from '../email/emailTypes';
import { getHmacSecret, generateSignedEventRecipientToken } from '../hmacTokens';

declare const $app: PocketBaseApp;
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/generate-rsvp-tokens', (e) => {
  // __SHARED_UTILS__

  const authRecord = e.auth;
  if (!authRecord || authRecord.get('role') !== 'admin') {
    return e.json(403, { error: 'Forbidden: Admins only' });
  }

  const data = e.requestInfo().body as { [key: string]: unknown };
  const eventId = data.eventId;
  const profileIds = data.profileIds;

  if (!eventId || !profileIds || !Array.isArray(profileIds)) {
    return e.json(400, { error: 'Missing eventId or profileIds array' });
  }

  let secret: string;
  try {
    secret = getHmacSecret($app);
    if (!secret) throw new Error('Missing secret');
  } catch {
    return e.json(500, { error: 'HMAC_SECRET not configured' });
  }

  const tokens: { [key: string]: string } = {};
  (profileIds as string[]).forEach((pId) => {
    tokens[pId] = generateSignedEventRecipientToken($app, eventId as string, pId, secret);
  });

  return e.json(200, { tokens });
});
