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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('blank');

  const handleUseTemplate = useCallback(() => {
    if (selectedTemplateId === 'blank') {
      setSubject('');
      setContent('');
      setMessageType('Email');
    } else {
      const tpl = templates.find((t) => t.id === selectedTemplateId);
      if (tpl) {
        setSubject(tpl.subject || '');
        setContent(tpl.content || '');
        setMessageType(tpl.type === 'SMS' ? 'SMS' : tpl.type === 'Both' ? 'Both' : 'Email');
      }
    }
    onContinue();
  }, [selectedTemplateId, templates, setSubject, setContent, setMessageType, onContinue]);

  return {
    selectedTemplateId,
    setSelectedTemplateId,
    handleUseTemplate,
  };
}
