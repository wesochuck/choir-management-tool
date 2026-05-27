export type PublicTokenScope = 'player' | 'rsvp';

export class TokenUrlFactory {
  public static generatePublicLink(baseUrl: string, scope: PublicTokenScope, token: string): string {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const params = new URLSearchParams();
    params.set('scope', scope);
    params.set('token', token);
    return `${cleanBase}/public?${params.toString()}`;
  }

  public static extractTokenFromUrl(urlString: string): string | null {
    try {
      const urlObject = new URL(urlString);
      const primaryToken = urlObject.searchParams.get('token');
      const sParam = urlObject.searchParams.get('s');
      const pParam = urlObject.searchParams.get('p');

      if (!primaryToken) {
        return null;
      }

      if (sParam) {
        return `${primaryToken}&s=${sParam}`;
      }

      if (pParam) {
        return `${primaryToken}&p=${pParam}`;
      }

      return primaryToken;
    } catch (_err: unknown) {
      return null;
    }
  }
}
