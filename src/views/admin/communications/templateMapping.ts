import type { TemplateRecord } from '../../../services/communicationService';
import type { MessageTemplate } from '../../../types/Communication';

export const mapToMessageTemplate = (tpl: TemplateRecord): MessageTemplate => {
  const titleLower = tpl.title.toLowerCase();
  let category: MessageTemplate['category'] = 'general';

  if (titleLower.includes('rehearsal')) category = 'rehearsal';
  else if (titleLower.includes('due') || titleLower.includes('payment')) category = 'dues';
  else if (titleLower.includes('weather') || titleLower.includes('snow') || titleLower.includes('cancel')) category = 'weather';
  else if (titleLower.includes('attendance')) category = 'attendance';
  else if (titleLower.includes('blank')) category = 'blank';

  return {
    id: tpl.id,
    title: tpl.title,
    description: tpl.subject || tpl.content.substring(0, 100) || 'Pre-filled message template.',
    category,
    channel: (tpl.type?.toLowerCase() as 'email' | 'sms' | 'both') || 'email',
    origin: tpl.isSystemTemplate ? 'system' : 'custom',
    subjectLine: tpl.subject,
    content: tpl.content,
  };
};
