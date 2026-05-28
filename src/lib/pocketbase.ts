import PocketBase from 'pocketbase';

type ViteEnv = Record<string, string | boolean | undefined> & { PROD?: boolean };

const env = (import.meta as ImportMeta & { env?: ViteEnv }).env;
const defaultPbUrl = env?.PROD && typeof window !== 'undefined'
  ? window.location.origin
  : 'http://127.0.0.1:8090';

export const pb = new PocketBase(String(env?.VITE_PB_URL || defaultPbUrl));

// Disable auto-cancellation globally to prevent aborted requests from React Strict Mode double-mounting
pb.autoCancellation(false);

pb.beforeSend = (url, options) => {
  // Strip out skipTotal parameter if present to support older PocketBase server versions
  const cleanUrl = url
    .replace(/[&?]skipTotal=[^&]+/g, '')
    .replace(/\?&/g, '?')
    .replace(/\?$/g, '');
  return { url: cleanUrl, options };
};

pb.authStore.onChange(() => undefined, true);

pb.afterSend = async (response, data) => {
  if (response.status === 400) {
    console.error('[PB 400]', response.url, JSON.stringify(data, null, 2));
    // Debug: log token payload to check auth context
    try {
      const token = pb.authStore.token;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.error('[PB AUTH]', 'collectionId:', payload.collectionId, 'role:', pb.authStore.record?.role, 'model:', JSON.stringify(pb.authStore.record, null, 2));
      } else {
        console.error('[PB AUTH] No token in authStore');
      }
    } catch (e) { console.error('[PB AUTH] decode error', e); }
  }

  const isAuthError = response.status === 401 || response.status === 403;
  const isStaleToken400 = response.status === 400 && 
    data?.message?.includes('loadAuthToken');

  if (isAuthError || isStaleToken400) {
    console.warn("Stale or invalid session detected, clearing authStore.");
    pb.authStore.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  return data;
};

interface PocketBaseErrorData {
  [key: string]: {
    code: string;
    message: string;
  };
}

export function formatPocketBaseError(err: unknown): string {
  if (!err) return 'An unknown error occurred';
  
  const error = err as { data?: PocketBaseErrorData; message?: string };
  
  if (error.data && typeof error.data === 'object' && Object.keys(error.data).length > 0) {
    const details = Object.entries(error.data)
      .map(([field, info]) => {
        const code = info.code;
        const msg = info.message;
        
        // Convert camelCase to capitalized words (e.g. voicePart -> Voice Part)
        const friendlyField = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .trim()
          .replace(/^\w/, (c) => c.toUpperCase());

        // Standard validation translations
        if (code === 'validation_required' || code === 'validation_missing_required') {
          return `${friendlyField} is required.`;
        }
        
        // Custom domain validations
        if (field === 'email') {
          if (code === 'validation_not_unique') {
            return 'This email address is already in use by another account.';
          }
          if (code === 'validation_invalid_email') {
            return 'Please enter a valid email address.';
          }
        }
        
        if (field === 'password') {
          if (code === 'validation_len_out_of_range') {
            return 'Password must be between 8 and 72 characters.';
          }
        }

        // Fallback to capitalizing field + default error message
        return `${friendlyField}: ${msg || 'Invalid value.'}`;
      })
      .join('\n');
      
    return details;
  }
  
  return (err instanceof Error) ? err.message : 'An error occurred';
}
