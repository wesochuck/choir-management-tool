import React, { useState } from 'react';
import EasyMDE from 'easymde';
import './Communications.css';
import { AppCard } from '../../../components/common/AppCard';
import { PlaceholderPanel } from '../../../components/admin/PlaceholderPanel';
import { MarkdownEditor } from '../../../components/common/MarkdownEditor';
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
  editorRef: React.MutableRefObject<EasyMDE | null>;
  choirName: string;
  senderEmail: string;
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
  editorRef,
  choirName,
  senderEmail,
}: TemplatesPanelProps) {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');


  if (editingTemplate) {
    return (
      <div className="compose-grid">
        <div className="flex-col comm-compose-form">
          <AppCard title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
            <div className="composer-form comm-compose-form">
              <div className="comm-compose-header-row">
                <div className="comm-compose-field">
                  <label className="text-label">Template Title</label>
                  <input
                    className="card comm-compose-input"
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="e.g. Performance Call Time"
                    required
                  />
                </div>
                <div className="comm-compose-field comm-flex-0-0-150">
                  <label className="text-label">Channel</label>
                  <select
                    className="card comm-compose-input"
                    value={editingTemplate.type || 'Email'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        type: e.target.value as MessageType,
                        subject: e.target.value === 'SMS' ? '' : editingTemplate.subject,
                      })
                    }
                  >
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              <div className="comm-compose-field">
                <label className="text-label">Subject</label>
                <input
                  className="card comm-compose-input"
                  value={editingTemplate.subject || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  placeholder="e.g. Schedule for {eventTitle}"
                  disabled={editingTemplate.type === 'SMS'}
                  required={editingTemplate.type !== 'SMS'}
                />
              </div>

              <div className="comm-compose-field">
                <label className="text-label">Template Body (Markdown Supported)</label>
                <MarkdownEditor
                  instanceRef={editorRef}
                  value={editingTemplate.content || ''}
                  onChange={(val) =>
                    setEditingTemplate({ ...editingTemplate, content: val })
                  }
                  placeholder="Hello {singerName},&#10;&#10;Details: {eventDetails}"
                  minHeight="250px"
                />
              </div>
            </div>
          </AppCard>


          <AppCard
            title="Template Preview"
            actions={
              <div className="flex-row comm-template-editor-footer">
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'} comm-btn-small-padding`}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'} comm-btn-small-padding`}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  📱 Mobile
                </button>
              </div>
            }
          >
            <div
              className={`comm-email-mockup ${previewDevice === 'mobile' ? 'mobile-preview' : 'desktop-preview'}`}
            >
              <div
                className={`comm-email-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`}
              >
                <div className="comm-email-header">
                  <div className="comm-email-header-row">
                    <span className="comm-email-header-label">From:</span>
                    <span className="comm-color-slate-800">
                      {choirName} &lt;{senderEmail}&gt;
                    </span>
                  </div>
                  <div className="comm-email-header-row">
                    <span className="comm-email-header-label">Subject:</span>
                    <strong className="comm-color-slate-900">
                      {resolvePreviewContent(editingTemplate.subject || '', null, null)}
                    </strong>
                  </div>
                </div>
                <div
                  className={`comm-email-body ${previewDevice === 'mobile' ? 'mobile-padding' : 'desktop-padding'}`}
                >
                  <div
                    className="text-body message-preview-content"
                    // @allow-dangerouslySetInnerHTML - previewHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
                    dangerouslySetInnerHTML={{
                      __html:
                        previewHtml ||
                        '<p class="text-muted comm-empty-state-centered">No template content yet.</p>',
                    }}
                  />
                </div>
              </div>
            </div>
          </AppCard>

          <div className="flex-row comm-justify-end-gap-sm">
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
          className="btn btn-primary btn-sm comm-template-preview-btn"
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
      <div className="flex-col comm-compose-form">
        <p className="text-muted text-sm">
          Manage message templates. Custom templates can be added, edited, or deleted. System-defined templates cannot be deleted.
        </p>
        <div className="flex-col comm-gap-sm">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="card flex-responsive comm-template-item"
            >
              <div className="flex-col comm-gap-xs">
                <div className="flex-row comm-compose-header-row comm-items-center-gap-6">
                  <strong className="comm-font-95">{tpl.title}</strong>
                  <span className="badge badge-rehearsal comm-message-badge">
                    {tpl.type}
                  </span>
                  {tpl.isSystemTemplate && (
                    <span className="badge badge-concert comm-message-badge comm-opacity-80">
                      System
                    </span>
                  )}
                </div>
                <span className="text-muted text-xs comm-text-ellipsis-max-350">
                  {tpl.subject ? `Subject: ${tpl.subject}` : 'No Subject'} • {tpl.content.substring(0, 60)}...
                </span>
              </div>
              <div className="flex-row comm-gap-6px">
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
                    className="btn btn-ghost btn-sm comm-color-error"
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
            <div className="comm-empty-state-small">
              No templates found.
            </div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
