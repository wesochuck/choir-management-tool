import React, { useState } from 'react';
import EasyMDE from 'easymde';
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
        <div className="flex-col gap-4">
          <AppCard title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
            <div className="composer-form flex-col gap-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-label">Template Title</label>
                  <input
                    className="card h-10 px-3 w-full border border-border"
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="e.g. Performance Call Time"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1 flex-[0_0_150px]">
                  <label className="text-label">Channel</label>
                  <select
                    className="card h-10 px-3 w-full border border-border"
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

              <div className="flex flex-col gap-1">
                <label className="text-label">Subject</label>
                <input
                  className="card h-10 px-3 w-full border border-border"
                  value={editingTemplate.subject || ''}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                  }
                  placeholder="e.g. Schedule for {eventTitle}"
                  disabled={editingTemplate.type === 'SMS'}
                  required={editingTemplate.type !== 'SMS'}
                />
              </div>

              <div className="flex flex-col gap-1">
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
              <div className="flex gap-4 p-4 border-t border-border bg-[#f8fafc] rounded-b-lg">
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'} px-2.5 py-1 h-[30px]`}
                  onClick={() => setPreviewDevice('desktop')}
                >
                  🖥️ Desktop
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'} px-2.5 py-1 h-[30px]`}
                  onClick={() => setPreviewDevice('mobile')}
                >
                  📱 Mobile
                </button>
              </div>
            }
          >
            <div
              className={`border border-border rounded-lg overflow-hidden bg-slate-100 flex justify-center transition-all duration-300 ${previewDevice === 'mobile' ? 'px-[15px] py-[30px]' : 'p-0'}`}
            >
              <div
                className={`w-full bg-surface shadow-md flex flex-col transition-all duration-300 min-h-[400px] ${previewDevice === 'mobile' ? 'max-w-[375px] rounded-[20px] border-8 border-slate-800' : 'max-w-full rounded-none border-0'}`}
              >
                <div className="p-4 border-b border-border bg-[#f8fafc] text-xs flex flex-col gap-1.5">
                  <div className="flex text-text-muted">
                    <span className="w-[60px] font-semibold">From:</span>
                    <span className="text-slate-800">
                      {choirName} &lt;{senderEmail}&gt;
                    </span>
                  </div>
                  <div className="flex text-text-muted">
                    <span className="w-[60px] font-semibold">Subject:</span>
                    <strong className="text-slate-900">
                      {resolvePreviewContent(editingTemplate.subject || '', null, null)}
                    </strong>
                  </div>
                </div>
                <div
                  className={`overflow-y-auto flex-1 text-sm leading-relaxed text-slate-600 break-words ${previewDevice === 'mobile' ? 'p-4' : 'p-6'}`}
                >
                  <div
                    className="text-body message-preview-content"
                    // @allow-dangerouslySetInnerHTML - previewHtml is pre-escaped by renderMarkdown/resolvePreviewContent (use with caution)
                    dangerouslySetInnerHTML={{
                      __html:
                        previewHtml ||
                        '<p class="text-muted" style="text-align:center;padding:2rem 0">No template content yet.</p>',
                    }}
                  />
                </div>
              </div>
            </div>
          </AppCard>

          <div className="flex justify-end gap-2">
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
          className="btn btn-primary btn-sm h-8 inline-flex items-center gap-1 px-2 text-xs rounded bg-slate-100 text-slate-600 border border-border"
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
      <div className="flex-col gap-4">
        <p className="text-muted text-sm">
          Manage message templates. Custom templates can be added, edited, or deleted. System-defined templates cannot be deleted.
        </p>
        <div className="flex-col gap-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="card flex flex-col md:flex-row px-4 py-2 justify-between items-center shadow-none border border-border m-0"
            >
              <div className="flex-col gap-0.5">
                <div className="flex gap-4 flex-wrap items-center gap-1.5">
                  <strong className="text-sm">{tpl.title}</strong>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-primary-light text-primary-deep">
                    {tpl.type}
                  </span>
                  {tpl.isSystemTemplate && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-performance-bg text-performance-text opacity-80">
                      System
                    </span>
                  )}
                </div>
                <span className="text-muted text-xs truncate max-w-[350px]">
                  {tpl.subject ? `Subject: ${tpl.subject}` : 'No Subject'} • {tpl.content.substring(0, 60)}...
                </span>
              </div>
              <div className="flex gap-1.5">
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
                    className="btn btn-ghost btn-sm text-red-500"
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
            <div className="flex flex-col items-center justify-center py-8 text-text-muted text-sm">
              No templates found.
            </div>
          )}
        </div>
      </div>
    </AppCard>
  );
}
