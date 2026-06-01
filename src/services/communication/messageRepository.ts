import { pb } from '../../lib/pocketbase';
import { eventService, type Event } from '../eventService';
import {
  settingsService,
  type CommunicationConfig,
} from '../settingsService';
import type {
  MessageRecord,
  SendMessageInput,
  TemplateRecord,
} from './types';

async function getMessages() {
  return await pb.collection('messages').getFullList<MessageRecord>({
    sort: '-created',
    filter: 'status = "Sent"',
  });
}

async function getMessagesPaginated(
  page: number,
  perPage: number,
  filterString = 'status = "Sent"'
) {
  return await pb.collection('messages').getList<MessageRecord>(page, perPage, {
    sort: '-created',
    filter: filterString,
  });
}

async function getDrafts() {
  return await pb.collection('messages').getFullList<MessageRecord>({
    sort: '-created',
    filter: 'status = "Draft"',
  });
}

async function saveDraft(data: SendMessageInput, id?: string) {
  const payload = { ...data, status: 'Draft' as const };
  if (id) {
    return await pb.collection('messages').update<MessageRecord>(id, payload);
  }
  return await pb.collection('messages').create<MessageRecord>(payload);
}

async function deleteDraft(id: string) {
  return await pb.collection('messages').delete(id);
}

async function getTemplates() {
  return await pb.collection('messageTemplates').getFullList<TemplateRecord>({
    sort: 'title',
  });
}

async function saveTemplate(data: Partial<TemplateRecord>) {
  if (data.id) {
    return await pb.collection('messageTemplates').update<TemplateRecord>(data.id, data);
  }
  return await pb.collection('messageTemplates').create<TemplateRecord>(data as TemplateRecord);
}

async function deleteTemplate(id: string) {
  return await pb.collection('messageTemplates').delete(id);
}

async function getEvents(): Promise<Event[]> {
  return await eventService.getEvents();
}

async function getConfig(): Promise<CommunicationConfig> {
  return await settingsService.getCommunicationConfig();
}

async function saveConfig(value: CommunicationConfig) {
  return await settingsService.saveCommunicationConfig(value);
}

async function saveMessage(data: SendMessageInput) {
  return await pb.collection('messages').create<MessageRecord>(data);
}

export const messageRepository = {
  getMessages,
  getMessagesPaginated,
  getDrafts,
  saveDraft,
  deleteDraft,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getEvents,
  getConfig,
  saveConfig,
  saveMessage,
};
