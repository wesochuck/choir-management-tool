import { pb } from '../pocketbase';
import type { RecordModel } from 'pocketbase';

export interface AppSetting<T> extends RecordModel {
  key: string;
  value: T;
  isPublic: boolean;
}

const inFlightRequests: Record<string, Promise<unknown>> = {};

export const getSetting = async <T>(key: string): Promise<AppSetting<T> | null> => {
  const existing = inFlightRequests[key];
  if (existing) return existing as Promise<AppSetting<T> | null>;

  const promise = pb
    .collection('appSettings')
    .getFirstListItem<AppSetting<T>>(pb.filter('key = {:key}', { key }))
    .then((setting) => setting)
    .catch((err: unknown) => {
      if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
      throw err;
    });

  inFlightRequests[key] = promise;
  void promise.then(
    () => {
      delete inFlightRequests[key];
    },
    () => {
      delete inFlightRequests[key];
    }
  );

  return promise;
};

export const upsertSetting = async <T>(key: string, value: T, isPublic: boolean) => {
  const existing = await getSetting<T>(key);
  const payload = { key, value, isPublic };

  if (existing) {
    return await pb.collection('appSettings').update<AppSetting<T>>(existing.id, payload);
  }

  return await pb.collection('appSettings').create<AppSetting<T>>(payload);
};
