import React, { useState } from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { PlaceholderPanel } from '../../../components/admin/PlaceholderPanel';
import {
  communicationService,
  type TemplateRecord,
  type MessageType,
} from '../../../services/communicationService';
import { resolvePreviewContent } from '../../../lib/communicationUtils';
import { useDialog } from '../../../contexts/DialogContext';

export interface TemplatesPanelProps {
  templates: TemplateRecord[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>>;
  editingTemplate: Partial<TemplateRecord> | null;
  setEditingTemplate: React.Dispatch<
    React.SetStateAction<Partial<TemplateRecord> | null>
  >;
  onUseTemplate?: (template: TemplateRecord) => void;
  dialog: ReturnType<typeof useDialog>;
  previewHtml: string;
  onInsertPlaceholder: (tag: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TemplatesPanel({
  templates,
  setTemplates,
  editingTemplate,
  setEditingTemplate,
  onUseTemplate,
  dialog,
  previewHtml,
  onInsertPlaceholder,
  textAreaRef,
}: TemplatesPanelProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (editingTemplate) {
    return (
      <div className="compose-grid">
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <AppCard title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
            <div className="composer-form">
              <div className="composer-header-row">
                <div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1 }}>
                  <label className="text-label">Template Title</label>
                  <input
                    className="card"
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="e.g. Performance Call Time"
                    style={{ height: '44px', padding: '0 12px' }}
                    required
                  />
                </div>
                <div className="composer-channel-field flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Channel</label>
                  <select
                    className="card"
                    value={editingTemplate.type || 'Email'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        type: e.target.value as MessageType,
                        subject: e.target.value === 'SMS' ? '' : editingTemplate.subject,
                      })
                    }
                    style={{ height: '44px', padding: '0 12px' }}
                  >
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Subject</label>
                <input
                  className="card"
                  value={editingTemplate.subject || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  placeholder="e.g. Schedule for {eventTitle}"
                  style={{ height: '44px', padding: '0 12px' }}
                  disabled={editingTemplate.type === 'SMS'}
                  required={editingTemplate.type !== 'SMS'}
                />
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Template Body (Markdown Supported)</label>
                <textarea
                  ref={textAreaRef}
                  className="card composer-textarea"
                  value={editingTemplate.content || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, content: e.target.value })
                  }
                  placeholder="Hello {singerName},&#10;&#10;Details: {eventDetails}"
                />
              </div>
            </div>
          </AppCard>

          <AppCard
            title="Template Preview"
            actions={
              <div
                className="flex-row"
                style={{
                  gap: '4px',
                  backgroundColor: 'var(--bg)',
                  padding: '2px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', height: '30px' }}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', height: '30px' }}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  📱 Mobile
                </button>
              </div>
            }
          >
            <div
              className="email-client-mockup"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md, 8px)',
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                padding: previewDevice === 'mobile' ? '30px 15px' : '0',
                display: 'flex',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div
                className={`email-client-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`}
                style={{
                  width: '100%',
                  maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
                  backgroundColor: '#ffffff',
                  boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
                  borderRadius: previewDevice === 'mobile' ? '20px' : '0',
                  border: previewDevice === 'mobile' ? '8px solid #1e293b' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: '400px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', color: '#64748b' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>From:</span>
                    <span style={{ color: '#1e293b' }}>
                      Choir Management &lt;no-reply@choir.management&gt;
                    </span>
                  </div>
                  <div style={{ display: 'flex', color: '#64748b' }}>
                    <span style={{ width: '60px', fontWeight: 600 }}>Subject:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {resolvePreviewContent(editingTemplate.subject || '', null, null)}
                    </strong>
                  </div>
                </div>
                <div
                  className="email-client-body"
                  style={{
                    padding: previewDevice === 'mobile' ? '16px' : '24px',
                    overflowY: 'auto',
                    flex: 1,
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: '#334155',
                    wordBreak: 'break-word',
                  }}
                >
                  <div
                    className="text-body message-preview-content"
                    // @allow-dangerouslySetInnerHTML - previewHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
                    dangerouslySetInnerHTML={{
                      __html:
                        previewHtml ||
                        '<p class="text-muted" style="text-align: center; padding: 40px 0;">No template content yet.</p>',
                    }}
                  />
                </div>
              </div>
            </div>
          </AppCard>

          <div
            className="flex-row"
            style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)' }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditingTemplate(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!editingTemplate.title || !editingTemplate.content) {
                  dialog.showToast('Title and content are required.');
                  return;
                }
                try {
                  await communicationService.saveTemplate(editingTemplate);
                  setTemplates(await communicationService.getTemplates());
                  setEditingTemplate(null);
                  dialog.showToast('Template saved successfully.');
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : String(err);
                  await dialog.showMessage({
                    title: 'Error',
                    message: 'Failed to save template: ' + msg,
                    variant: 'danger',
                  });
                }
              }}
            >
              Save Template
            </button>
          </div>
        </div>
        <PlaceholderPanel onInsert={onInsertPlaceholder} />
      </div>
    );
  }

  return (
    <AppCard
      title="Message Templates"
      actions={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ height: '32px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          onClick={() =>
            setEditingTemplate({
              title: '',
              subject: '',
              content: '',
              type: 'Email',
              isSystemTemplate: false,
            })
          }
        >
          ➕ Add Custom Template
        </button>
      }
    >
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <p className="text-muted text-sm" style={{ margin: 0 }}>
          Manage message templates. Custom templates can be added, edited, or deleted. System-defined templates cannot be deleted.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="card flex-responsive"
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'none',
                border: '1px solid var(--border)',
                margin: 0,
              }}
            >
              <div className="flex-col" style={{ gap: '2px' }}>
                <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{tpl.title}</strong>
                  <span
                    className="badge badge-rehearsal"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                  >
                    {tpl.type}
                  </span>
                  {tpl.isSystemTemplate && (
                    <span
                      className="badge badge-concert"
                      style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.8 }}
                    >
                      System
                    </span>
                  )}
                </div>
                <span
                  className="text-muted text-xs"
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '350px',
                  }}
                >
                  {tpl.subject ? `Subject: ${tpl.subject}` : 'No Subject'} • {tpl.content.substring(0, 60)}...
                </span>
              </div>
              <div className="flex-row" style={{ gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingTemplate(tpl)}
                >
                  Edit
                </button>
                {onUseTemplate && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onUseTemplate(tpl)}
                  >
                    Use
                  </button>
                )}
                {!tpl.isSystemTemplate && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={async () => {
                      if (
                        await dialog.confirm({
                          title: 'Delete Template',
                          message: `Are you sure you want to delete the template "${tpl.title}"?`,
                          variant: 'danger',
                        })
                      ) {
                        try {
                          await communicationService.deleteTemplate(tpl.id!);
                          setTemplates(await communicationService.getTemplates());
                        } catch (e: unknown) {
                          const msg = e instanceof Error ? e.message : String(e);
                          await dialog.showMessage({
                            title: 'Error',
                            message: 'Failed to delete template: ' + msg,
                            variant: 'danger',
                          });
                        }
                      }
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
              No templates found.
            </div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
