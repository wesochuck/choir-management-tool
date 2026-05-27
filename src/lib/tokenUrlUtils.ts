export type PublicTokenScope = 'player' | 'rsvp' | 'poll';

function appendTokenFragments(token: string, pParam: string | null, sParam: string | null): string {
  if (!token) return token;

  const hasP = token.includes('p=');
  const hasS = token.includes('s=');

  let result = token;
  if (pParam && !hasP) {
    result = `${result}&p=${pParam}`;
  }
  if (sParam && !hasS) {
    result = `${result}&s=${sParam}`;
  }
  return result;
}

export class TokenUrlFactory {
  public static generatePublicLink(baseUrl: string, scope: PublicTokenScope, token: string): string {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const params = new URLSearchParams();
    params.set('token', token);
    return `${cleanBase}/${scope}?${params.toString()}`;
  }

  public static extractTokenFromUrl(urlString: string): string | null {
    try {
      const urlObject = new URL(urlString);
      return TokenUrlFactory.extractTokenFromSearchParams(urlObject.searchParams);
    } catch (_err: unknown) {
      return null;
    }
  }

  public static extractTokenFromSearchParams(searchParams: URLSearchParams): string | null {
    const token = searchParams.get('token');
    if (!token) {
      return null;
    }

    const pParam = searchParams.get('p');
    const sParam = searchParams.get('s');

    return appendTokenFragments(token, pParam, sParam);
  }
}
