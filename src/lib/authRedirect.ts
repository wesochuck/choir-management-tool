const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/reset-password',
  '/auditions',
  '/rsvp',
  '/poll',
  '/unsubscribe',
  '/player',
] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((route) => (
    pathname === route || pathname.startsWith(`${route}/`)
  ));
}

export function shouldRedirectAuthErrorToLogin(pathname: string): boolean {
  return !isPublicRoute(pathname);
}
