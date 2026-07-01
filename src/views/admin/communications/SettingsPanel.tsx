import React, { useEffect, useState } from 'react';
import EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { TemplateRecord } from '../../../services/communicationService';
import { useDialog } from '../../../contexts/DialogContext';
import { TemplatesPanel } from './TemplatesPanel';

import { Button, Input } from '../../../components/ui';

export interface SettingsPanelProps {
  commSettings: CommunicationSettings;
  setCommSettings: React.Dispatch<React.SetStateAction<CommunicationSettings>>;
  testEmailAddress: string;
  setTestEmailAddress: (value: string) => void;
  isTestingSmtp: boolean;
  onSendConnectionTest: () => Promise<void>;
  testPhoneNumber: string;
  setTestPhoneNumber: (value: string) => void;
  isTestingSms: boolean;
  onSendSmsTest: () => Promise<void>;
  isSavingConfig: boolean;
  onSaveSettings: () => Promise<void>;

  // Templates related props
  templates: TemplateRecord[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>>;
  editingTemplate: Partial<TemplateRecord> | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
  previewHtml: string;
  onInsertPlaceholder: (tag: string) => void;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  dialog: ReturnType<typeof useDialog>;
  choirName: string;
  senderEmail: string;
}

export function SettingsPanel({
  commSettings,
  setCommSettings,
  testEmailAddress,
  setTestEmailAddress,
  isTestingSmtp,
  onSendConnectionTest,
  testPhoneNumber,
  setTestPhoneNumber,
  isTestingSms,
  onSendSmsTest,
  isSavingConfig,
  onSaveSettings,
  templates,
  setTemplates,
  editingTemplate,
  setEditingTemplate,
  previewHtml,
  onInsertPlaceholder,
  editorRef,
  dialog,
  choirName,
  senderEmail,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<CommunicationSettings>(commSettings);

  useEffect(() => {
    setLocalSettings(commSettings);
  }, [commSettings]);

  const handleSave = async () => {
    setCommSettings(localSettings);
    await onSaveSettings();
  };

  return (
    <div className="flex flex-col gap-4">
      {editingTemplate ? (
        <TemplatesPanel
          templates={templates}
          setTemplates={setTemplates}
          editingTemplate={editingTemplate}
          setEditingTemplate={setEditingTemplate}
          dialog={dialog}
          previewHtml={previewHtml}
          onInsertPlaceholder={onInsertPlaceholder}
          editorRef={editorRef}
          choirName={choirName}
          senderEmail={senderEmail}
        />
      ) : (
        <>
          <AppCard title="Application & Footer Compliance">
            <div className="flex flex-col gap-4">
              <SettingsGrid>
                <Field
                  label="Physical Mailing Address"
                  value={localSettings.mailingAddress}
                  onChange={(v) => setLocalSettings((prev) => ({ ...prev, mailingAddress: v }))}
                />
                <Field
                  label="Application Base URL"
                  value={localSettings.frontendUrl}
                  onChange={(v) => setLocalSettings((prev) => ({ ...prev, frontendUrl: v }))}
                />
              </SettingsGrid>
              <div className="text-muted text-xs">
                Note: These values are used for legal compliance (footer) and link generation.
              </div>
            </div>
          </AppCard>

          <TemplatesPanel
            templates={templates}
            setTemplates={setTemplates}
            editingTemplate={editingTemplate}
            setEditingTemplate={setEditingTemplate}
            dialog={dialog}
            previewHtml={previewHtml}
            onInsertPlaceholder={onInsertPlaceholder}
            editorRef={editorRef}
            choirName={choirName}
            senderEmail={senderEmail}
          />

          <AppCard title="Test Outgoing Connections">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-muted text-sm">
                  Send a quick test email using the active provider settings to verify delivery.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Input
                    className="max-w-[300px] flex-1"
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="e.g. test@example.com"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onSendConnectionTest}
                    disabled={isTestingSmtp || !testEmailAddress}
                  >
                    {isTestingSmtp ? 'Sending Test...' : '🧪 Send Test Email'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-muted text-sm">
                  Send a quick test SMS using the active provider settings to verify delivery.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Input
                    className="max-w-[300px] flex-1"
                    type="tel"
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="e.g. 5551234567"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onSendSmsTest}
                    disabled={isTestingSms || !testPhoneNumber}
                  >
                    {isTestingSms ? 'Sending Test...' : '📱 Send Test SMS'}
                  </Button>
                </div>
              </div>
            </div>
          </AppCard>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSave} disabled={isSavingConfig}>
              {isSavingConfig ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">{children}</div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
