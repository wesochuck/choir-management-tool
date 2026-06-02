import React from 'react';
import EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { TemplateRecord } from '../../../services/communicationService';
import { useDialog } from '../../../contexts/DialogContext';
import { TemplatesPanel } from './TemplatesPanel';

export interface SettingsPanelProps {
  commSettings: CommunicationSettings;
  setCommSettings: React.Dispatch<React.SetStateAction<CommunicationSettings>>;
  testEmailAddress: string;
  setTestEmailAddress: (value: string) => void;
  isTestingSmtp: boolean;
  onSendConnectionTest: () => Promise<void>;
  isSavingConfig: boolean;
  onSaveSettings: () => Promise<void>;

  // Templates related props
  templates: TemplateRecord[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>>;
  editingTemplate: Partial<TemplateRecord> | null;
  setEditingTemplate: React.Dispatch<
    React.SetStateAction<Partial<TemplateRecord> | null>
  >;
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
  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
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
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <SettingsGrid>
                <Field
                  label="Physical Mailing Address"
                  value={commSettings.mailingAddress}
                  onChange={(v) => setCommSettings({ ...commSettings, mailingAddress: v })}
                />
                <Field
                  label="Application Base URL"
                  value={commSettings.frontendUrl}
                  onChange={(v) => setCommSettings({ ...commSettings, frontendUrl: v })}
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



          <AppCard title="Test Server SMTP Connection">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted text-sm" style={{ margin: 0 }}>
                Send a quick test email using the server's configured SMTP settings to verify that
                outgoing mail delivery is working.
              </p>
              <div
                className="flex-row"
                style={{
                  gap: 'var(--space-sm)',
                  alignItems: 'center',
                  marginTop: 'var(--space-sm)',
                }}
              >
                <input
                  className="card"
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="e.g. test@example.com"
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    flex: 1,
                    maxWidth: '300px',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onSendConnectionTest}
                  disabled={isTestingSmtp || !testEmailAddress}
                >
                  {isTestingSmtp ? 'Sending Test...' : '🧪 Send Test Email'}
                </button>
              </div>
            </div>
          </AppCard>

          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={onSaveSettings}
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'var(--space-md)',
      }}
    >
      {children}
    </div>
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
    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
      <label className="text-label">{label}</label>
      <input
        className="card"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ height: '44px', padding: '0 12px' }}
      />
    </div>
  );
}
