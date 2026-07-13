import { useState } from 'react';
import type React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import {
  PlaceholderPanel,
  type PlaceholderContext,
} from '../../../components/admin/PlaceholderPanel';
import { MarkdownEditor } from '../../../components/common/MarkdownEditor';
import {
  communicationService,
  type TemplateRecord,
  type MessageType,
} from '../../../services/communicationService';
import { queryKeys } from '../../../lib/queryKeys';
import { resolvePreviewContent } from '../../../lib/communicationUtils';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { useDialog } from '../../../contexts/DialogContext';
import { Button, Select, Input, DataTable, type ColumnDef } from '../../../components/ui';

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

function getTemplatePlaceholderContext(
  template: Partial<TemplateRecord> | null
): PlaceholderContext {
  const title = (template?.title || '').toLowerCase();

  if (title.includes('bundle ticket confirmation')) {
    return 'bundleTicketConfirmation';
  }

  if (title.includes('ticket confirmation')) {
    return 'ticketConfirmation';
  }

  return 'standard';
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
                  <label htmlFor="template-title" className="text-label">
                    Template Title
                  </label>
                  <Input
                    id="template-title"
                    value={editingTemplate.title || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="e.g. Performance Call Time"
                    required
                  />
                </div>
                <div className="flex flex-[0_0_150px] flex-col gap-1">
                  <label htmlFor="template-channel" className="text-label">
                    Channel
                  </label>
                  <Select
                    id="template-channel"
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
                <label htmlFor="template-subject" className="text-label">
                  Subject
                </label>
                <Input
                  id="template-subject"
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
                <label htmlFor="template-body" className="text-label">
                  Template Body (Markdown Supported)
                </label>
                <MarkdownEditor
                  id="template-body"
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
                  aria-pressed={previewDevice === 'desktop'}
                  size="small"
                  className="h-[30px]"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <span aria-hidden="true">🖥️</span>
                  <span>Desktop</span>
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === 'mobile' ? 'secondary' : 'outline'}
                  aria-pressed={previewDevice === 'mobile'}
                  size="small"
                  className="h-[30px]"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <span aria-hidden="true">📱</span>
                  <span>Mobile</span>
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
                  await dialog.showMessage({
                    title: 'Template Not Saved',
                    message: formatPocketBaseError(err),
                    variant: 'danger',
                  });
                }
              }}
            >
              Save Template
            </Button>
          </div>
        </div>
        <PlaceholderPanel
          context={getTemplatePlaceholderContext(editingTemplate)}
          onInsert={onInsertPlaceholder}
        />
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
          <span aria-hidden="true">➕</span>
          <span>Add Custom Template</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          Manage message templates. Custom templates can be added, edited, or deleted.
          System-defined templates cannot be deleted.
        </p>
        <DataTable
          columns={
            [
              {
                id: 'title',
                header: 'Title',
                cell: ({ row }) => (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{row.original.title}</span>
                    {row.original.isSystemTemplate && (
                      <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase opacity-80">
                        System
                      </span>
                    )}
                  </div>
                ),
                meta: {
                  cardSection: 0,
                  cardSide: 'left',
                },
              },
              {
                id: 'type',
                header: 'Type',
                cell: ({ row }) => (
                  <span className="bg-primary-light text-primary-deep inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                    {row.original.type}
                  </span>
                ),
                meta: {
                  cardSection: 0,
                  cardSide: 'right',
                },
              },
              {
                id: 'subject',
                header: 'Subject',
                cell: ({ row }) => (
                  <span className="text-muted max-w-[250px] truncate">
                    {row.original.subject || 'No Subject'}
                  </span>
                ),
                meta: {
                  cardSection: 1,
                  cardSide: 'left',
                  cardLabel: 'Subject',
                },
              },
              {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setEditingTemplate(row.original)}
                    >
                      Edit
                    </Button>
                    {onUseTemplate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={() => onUseTemplate(row.original)}
                      >
                        Use
                      </Button>
                    )}
                    {!row.original.isSystemTemplate && (
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={async () => {
                          if (
                            await dialog.confirm({
                              title: 'Delete Template',
                              message: `Are you sure you want to delete the template "${row.original.title}"?`,
                              variant: 'danger',
                            })
                          ) {
                            try {
                              await communicationService.deleteTemplate(row.original.id!);
                              queryClient.invalidateQueries({
                                queryKey: queryKeys.communications.templates(),
                              });
                            } catch (e: unknown) {
                              await dialog.showMessage({
                                title: 'Template Not Deleted',
                                message: formatPocketBaseError(e),
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
                ),
                meta: {
                  align: 'right',
                  cardSection: 1,
                  cardSide: 'right',
                },
              },
            ] as ColumnDef<TemplateRecord>[]
          }
          data={templates}
          isLoading={false}
          emptyState={{
            title: 'No templates found.',
            icon: (
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-muted"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            ),
          }}
          hidePagination
        />
      </div>
    </AppCard>
  );
}
