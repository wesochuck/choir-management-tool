import { useCallback, useState } from 'react';
import type { MessageType, TemplateRecord } from '../../../services/communicationService';

interface UseTemplateSelectionArgs {
  templates: TemplateRecord[];
  setSubject: (value: string) => void;
  setContent: (value: string) => void;
  setMessageType: (value: MessageType) => void;
  onContinue: () => void;
}

export function useTemplateSelection({
  templates,
  setSubject,
  setContent,
  setMessageType,
  onContinue,
}: UseTemplateSelectionArgs) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');

  const handleUseTemplate = useCallback(() => {
    if (selectedTemplateId === 'blank') {
      setSubject('');
      setContent('');
      setMessageType('Email');
    } else {
      const template = templates.find((item) => item.id === selectedTemplateId);
      if (!template) return;
      setSubject(template.subject || '');
      setContent(template.content || '');
      setMessageType(template.type === 'SMS' ? 'SMS' : template.type === 'Both' ? 'Both' : 'Email');
    }
    onContinue();
  }, [selectedTemplateId, templates, setSubject, setContent, setMessageType, onContinue]);

  return {
    selectedTemplateId,
    setSelectedTemplateId,
    handleUseTemplate,
  };
}
