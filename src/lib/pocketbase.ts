import PocketBase from 'pocketbase';
import type { SendOptions } from 'pocketbase';
import { shouldRedirectAuthErrorToLogin } from './authRedirect';

type ViteEnv = Record<string, string | boolean | undefined> & { PROD?: boolean };

const env = (import.meta as ImportMeta & { env?: ViteEnv }).env;
const defaultPbUrl =
  env?.PROD && typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8090';

export const pb = new PocketBase(String(env?.VITE_PB_URL || defaultPbUrl));

export function shouldClearExpiredAuthToken(token: string, isValid: boolean): boolean {
  return token.length > 0 && !isValid;
}

export function removeAuthorizationHeader(options: SendOptions): SendOptions {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).filter(([name]) => name.toLowerCase() !== 'authorization')
  );
  return { ...options, headers };
}

// Disable auto-cancellation globally to prevent aborted requests from React Strict Mode double-mounting
pb.autoCancellation(false);

pb.beforeSend = (url, options) => {
  let requestOptions = options;
  if (shouldClearExpiredAuthToken(pb.authStore.token, pb.authStore.isValid)) {
    pb.authStore.clear();
    requestOptions = removeAuthorizationHeader(options);
  }

  // Strip out skipTotal parameter if present to support older PocketBase server versions
  const cleanUrl = url
    .replace(/[&?]skipTotal=[^&]+/g, '')
    .replace(/\?&/g, '?')
    .replace(/\?$/g, '');
  return { url: cleanUrl, options: requestOptions };
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
        console.error(
          '[PB AUTH]',
          'collectionId:',
          payload.collectionId,
          'role:',
          pb.authStore.record?.role,
          'model:',
          JSON.stringify(pb.authStore.record, null, 2)
        );
      } else {
        console.error('[PB AUTH] No token in authStore');
      }
    } catch (e) {
      console.error('[PB AUTH] decode error', e);
    }
  }

  const isAuthError =
    (response.status === 401 || response.status === 403) &&
    data?.message !== 'Batch requests are not allowed.';
  const isStaleToken400 = response.status === 400 && data?.message?.includes('loadAuthToken');

  if (isAuthError || isStaleToken400) {
    console.warn('Stale or invalid session detected, clearing authStore.');
    pb.authStore.clear();

    if (typeof window !== 'undefined' && shouldRedirectAuthErrorToLogin(window.location.pathname)) {
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

  let validationData: PocketBaseErrorData | undefined;

  if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    const responseObj = errObj.response as Record<string, unknown> | undefined;
    const dataObj = errObj.data as Record<string, unknown> | undefined;

    // ClientResponseError stores the API response JSON in .response
    if (responseObj?.data && typeof responseObj.data === 'object') {
      validationData = responseObj.data as PocketBaseErrorData;
    }
    // Fallback if it's placed in .data.data
    else if (dataObj?.data && typeof dataObj.data === 'object') {
      validationData = dataObj.data as PocketBaseErrorData;
    }
    // Fallback if it's exactly the dictionary
    else if (
      dataObj &&
      typeof dataObj === 'object' &&
      !('code' in dataObj && 'message' in dataObj)
    ) {
      validationData = dataObj as PocketBaseErrorData;
    }
  }

  if (validationData && Object.keys(validationData).length > 0) {
    const details = Object.entries(validationData)
      .map(([field, info]) => {
        // Skip if info is not a field-error object
        if (!info || typeof info !== 'object' || !('message' in info)) {
          return null;
        }

        const code = (info as { code: string }).code;
        const msg = (info as { message: string }).message;

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
      .filter(Boolean)
      .join('\n');

    if (details) return details;
  }

  return err instanceof Error ? err.message : 'An error occurred';
}
