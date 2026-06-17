import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import { PlaceholderPanel } from '../../../components/admin/PlaceholderPanel';
import { MarkdownEditor } from '../../../components/common/MarkdownEditor';
import {
  communicationService,
  type TemplateRecord,
  type MessageType,
} from '../../../services/communicationService';
import { queryKeys } from '../../../lib/queryKeys';
import { resolvePreviewContent } from '../../../lib/communicationUtils';
import { useDialog } from '../../../contexts/DialogContext';
import { Button, Select, Input } from '../../../components/ui';

export interface TemplatesPanelProps {
  templates: TemplateRecord[];
  setTemplates: React.Dispatch<React.SetStateAction<TemplateRecord[]>>;
  editingTemplate: Partial<TemplateRecord> | null;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
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
  setTemplates: _setTemplates,
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
  void _setTemplates;
  const queryClient = useQueryClient();
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (editingTemplate) {
    return (
      <div className="flex flex-col items-start gap-6 lg:grid lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <AppCard title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-label">Template Title</label>
                  <Input
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="e.g. Performance Call Time"
                    required
                  />
                </div>
                <div className="flex flex-[0_0_150px] flex-col gap-1">
                  <label className="text-label">Channel</label>
                  <Select
                    size="small"
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
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label">Subject</label>
                <Input
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
                  onChange={(val) => setEditingTemplate({ ...editingTemplate, content: val })}
                  placeholder="Hello {singerName},&#10;&#10;Details: {eventDetails}"
                  minHeight="250px"
                />
              </div>
            </div>
          </AppCard>

          <AppCard
            title="Template Preview"
            actions={
              <div className="border-border flex gap-4 rounded-b-lg border-t bg-slate-50 p-4">
                <Button
                  type="button"
                  variant={previewDevice === 'desktop' ? 'secondary' : 'outline'}
                  size="small"
                  className="h-[30px]"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  🖥️ Desktop
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === 'mobile' ? 'secondary' : 'outline'}
                  size="small"
                  className="h-[30px]"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  📱 Mobile
                </Button>
              </div>
            }
          >
            <div
              className={`border-border flex justify-center overflow-hidden rounded-lg border bg-slate-100 transition-all duration-300 ${previewDevice === 'mobile' ? 'px-[15px] py-[30px]' : 'p-0'}`}
            >
              <div
                className={`bg-surface flex min-h-[400px] w-full flex-col shadow-md transition-all duration-300 ${previewDevice === 'mobile' ? 'max-w-[375px] rounded-[20px] border-8 border-slate-800' : 'max-w-full rounded-none border-0'}`}
              >
                <div className="border-border flex flex-col gap-1.5 border-b bg-slate-50 p-4 text-xs">
                  <div className="text-text-muted flex">
                    <span className="w-[60px] font-semibold">From:</span>
                    <span className="text-slate-800">
                      {choirName} &lt;{senderEmail}&gt;
                    </span>
                  </div>
                  <div className="text-text-muted flex">
                    <span className="w-[60px] font-semibold">Subject:</span>
                    <strong className="text-slate-900">
                      {resolvePreviewContent(editingTemplate.subject || '', null, null)}
                    </strong>
                  </div>
                </div>
                <div
                  className={`flex-1 overflow-y-auto text-sm leading-relaxed break-words text-slate-600 ${previewDevice === 'mobile' ? 'p-4' : 'p-6'}`}
                >
                  <div
                    className="text-body leading-relaxed"
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
            <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={async () => {
                if (!editingTemplate.title || !editingTemplate.content) {
                  dialog.showToast('Title and content are required.');
                  return;
                }
                try {
                  await communicationService.saveTemplate(editingTemplate);
                  queryClient.invalidateQueries({ queryKey: queryKeys.communications.templates() });
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
            </Button>
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
        <Button
          type="button"
          variant="primary"
          size="small"
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
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          Manage message templates. Custom templates can be added, edited, or deleted.
          System-defined templates cannot be deleted.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
                <th className="p-3 px-4 text-left">Title</th>
                <th className="p-3 px-4 text-left">Type</th>
                <th className="p-3 px-4 text-left">Subject</th>
                <th className="p-3 px-4 text-left">Content</th>
                <th className="p-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No templates found.
                  </td>
                </tr>
              ) : (
                templates.map((tpl) => (
                  <tr key={tpl.id} className="border-b border-gray-200 text-sm">
                    <td className="p-3 px-4 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{tpl.title}</span>
                        {tpl.isSystemTemplate && (
                          <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-80">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 px-4">
                      <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                        {tpl.type}
                      </span>
                    </td>
                    <td className="text-muted max-w-[250px] truncate p-3 px-4">
                      {tpl.subject || 'No Subject'}
                    </td>
                    <td className="text-muted max-w-[300px] truncate p-3 px-4">
                      {tpl.content.substring(0, 60)}...
                    </td>
                    <td className="p-3 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="small"
                          onClick={() => setEditingTemplate(tpl)}
                        >
                          Edit
                        </Button>
                        {onUseTemplate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            onClick={() => onUseTemplate(tpl)}
                          >
                            Use
                          </Button>
                        )}
                        {!tpl.isSystemTemplate && (
                          <Button
                            type="button"
                            variant="outline"
                            size="small"
                            className=""
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
                                  queryClient.invalidateQueries({ queryKey: queryKeys.communications.templates() });
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
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppCard>
  );
}
