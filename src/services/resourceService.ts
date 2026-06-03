import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export interface SingerResource extends RecordModel {
  title: string;
  file?: string;
  url?: string;
  sortOrder?: number;
}

type PocketBaseRecordBody = Record<string, unknown> | FormData;

const toRecordBody = (data: Partial<SingerResource> | FormData): PocketBaseRecordBody => {
  return data instanceof FormData ? data : data as Record<string, unknown>;
};

export const resourceService = {
  async getResources() {
    return await pb.collection('pbc_singer_res_001').getFullList<SingerResource>({
      sort: 'sortOrder,created',
    });
  },

  async createResource(data: Partial<SingerResource> | FormData) {
    return await pb.collection('pbc_singer_res_001').create<SingerResource>(toRecordBody(data));
  },

  async updateResource(id: string, data: Partial<SingerResource> | FormData) {
    return await pb.collection('pbc_singer_res_001').update<SingerResource>(id, toRecordBody(data));
  },

  async deleteResource(id: string) {
    return await pb.collection('pbc_singer_res_001').delete(id);
  },

  getResourceFileUrl(record: SingerResource, filename: string) {
    return pb.files.getURL(record, filename);
  }
};
