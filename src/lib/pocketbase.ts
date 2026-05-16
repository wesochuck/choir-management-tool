import PocketBase from 'pocketbase';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const pb = new PocketBase(env?.VITE_PB_URL || 'http://127.0.0.1:8090');

pb.authStore.onChange(() => undefined, true);

pb.afterSend = async (response, data) => {
  const isAuthError = response.status === 401 || response.status === 403;
  const isStaleToken400 = response.status === 400 && 
    (data?.message?.includes('loadAuthToken') || data?.message?.includes('rule failure'));

  if (isAuthError || isStaleToken400) {
    console.warn("Stale or invalid session detected, clearing authStore.");
    pb.authStore.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  return data;
};
