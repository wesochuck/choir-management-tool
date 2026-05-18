import PocketBase from 'pocketbase';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const pb = new PocketBase(env?.VITE_PB_URL || 'http://127.0.0.1:8090');

// Disable auto-cancellation globally to prevent aborted requests from React Strict Mode double-mounting
pb.autoCancellation(false);

pb.authStore.onChange(() => undefined, true);

pb.afterSend = async (response, data) => {
  const isAuthError = response.status === 401 || response.status === 403;
  const isStaleToken400 = response.status === 400 && 
    (
      data?.message?.includes('loadAuthToken') || 
      data?.message?.includes('rule failure') ||
      (
        (data?.message?.includes('Failed to create') || data?.message?.includes('Failed to update')) &&
        (!data?.data || Object.keys(data.data).length === 0)
      )
    );

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
