import { pb } from '../pocketbase';
import type { RecordModel } from 'pocketbase';

export async function getHeroImageUrl(): Promise<string | null> {
  try {
    const record = await pb
      .collection('appSettings')
      .getFirstListItem<RecordModel>(pb.filter('key = {:key}', { key: 'landingHeroImage' }));
    const filename = record['logo'] as string | undefined;
    if (!filename) return null;
    return pb.files.getURL(record, filename);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
    throw err;
  }
}

export async function saveHeroImage(file: File | null): Promise<void> {
  const key = 'landingHeroImage';
  let record: RecordModel;
  try {
    record = await pb
      .collection('appSettings')
      .getFirstListItem<RecordModel>(pb.filter('key = {:key}', { key }));
  } catch (err: unknown) {
    if (!(err && typeof err === 'object' && 'status' in err && err.status === 404)) {
      throw err;
    }
    record = await pb.collection('appSettings').create({
      key,
      value: 'heroImage',
      isPublic: true,
    });
  }
  const formData = new FormData();
  formData.append('logo', file ?? '');
  await pb.collection('appSettings').update(record.id, formData);
}

export async function getLogoUrl(): Promise<string | null> {
  try {
    const record = await pb
      .collection('appSettings')
      .getFirstListItem<RecordModel>(pb.filter('key = {:key}', { key: 'logo' }));
    const logo = record['logo'] as string | undefined;
    if (!logo) return null;
    return pb.files.getURL(record, logo);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) return null;
    throw err;
  }
}

export async function saveLogo(file: File | null): Promise<void> {
  const key = 'logo';

  let record: RecordModel;
  try {
    record = await pb
      .collection('appSettings')
      .getFirstListItem<RecordModel>(pb.filter('key = {:key}', { key }));
  } catch (err: unknown) {
    if (!(err && typeof err === 'object' && 'status' in err && err.status === 404)) {
      throw err;
    }
    record = await pb.collection('appSettings').create({
      key,
      value: 'logo',
      isPublic: true,
    });
  }

  const formData = new FormData();
  formData.append('logo', file ?? '');
  await pb.collection('appSettings').update(record.id, formData);
}
