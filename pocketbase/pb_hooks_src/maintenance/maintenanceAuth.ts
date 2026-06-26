import type { PocketBaseApp, PocketBaseRequestEvent } from '../email/emailTypes';

declare const $os: {
  getenv(key: string): string;
};

declare const $security: {
  equal(a: string, b: string): boolean;
};

export function isMaintenanceRequestAuthorized(
  e: PocketBaseRequestEvent,
  app: PocketBaseApp
): boolean {
  const admin = e.auth;
  if (admin && admin.get('role') === 'admin') {
    return true;
  }

  const secret = $os.getenv('MAINTENANCE_SECRET');
  if (!secret) {
    return false;
  }

  const queryToken = e.requestInfo().query.token;
  if (typeof queryToken === 'string' && $security.equal(queryToken, secret)) {
    return true;
  }

  const headers = e.requestInfo().headers || {};
  const authHeader = headers['Authorization'] || headers['authorization'];
  if (typeof authHeader === 'string') {
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && $security.equal(bearerMatch[1], secret)) {
      return true;
    }
  }

  return false;
}
