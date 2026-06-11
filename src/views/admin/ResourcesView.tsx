import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resourceService, type SingerResource } from '../../services/resourceService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { Button, Input, FormField, Badge, Modal } from '../../components/ui';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableResourceRow({
  resource,
  children,
  dragHandle,
}: {
  resource: SingerResource;
  children: React.ReactNode;
  dragHandle: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: resource.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : (transition || undefined),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <tr ref={setNodeRef} {...attributes} style={style} className="transition-colors hover:bg-slate-50/50">
      <td className="w-10 px-2 py-4 text-center" {...listeners}>
        {dragHandle}
      </td>
      {children}
    </tr>
  );
}

export default function ResourcesView() {
  const dialog = useDialog();
  const [resources, setResources] = useState<SingerResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<'file' | 'link'>('file');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await resourceService.getResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleEdit = (r: SingerResource) => {
    setEditingId(r.id);
    setTitle(r.title);
    if (r.url) {
      setResourceType('link');
      setUrl(r.url);
      setFile(null);
    } else {
      setResourceType('file');
      setUrl('');
      setFile(null);
    }
    setIsAdding(true);
  };

  const resetForm = () => {
    setTitle('');
    setResourceType('file');
    setUrl('');
    setFile(null);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('sortOrder', '0');

      if (resourceType === 'file') {
        if (file) {
          formData.append('file', file);
        }
        // Explicitly clear URL field
        formData.append('url', '');
      } else {
        let formattedUrl = url.trim();
        if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        formData.append('url', formattedUrl);
        // Explicitly clear File field if switching to link
        formData.append('file', '');
      }

      if (editingId) {
        await resourceService.updateResource(editingId, formData);
      } else {
        if (resourceType === 'file' && !file) {
          await dialog.showMessage({
            title: 'File Required',
            message: 'Please select a file to upload.',
            variant: 'danger',
          });
          setIsSaving(false);
          return;
        }
        if (resourceType === 'link' && !url.trim()) {
          await dialog.showMessage({
            title: 'URL Required',
            message: 'Please enter a valid link URL.',
            variant: 'danger',
          });
          setIsSaving(false);
          return;
        }
        await resourceService.createResource(formData);
      }

      dialog.showToast(editingId ? 'Resource updated!' : 'Resource added!');
      resetForm();
      await loadResources();
    } catch (err) {
      console.error('Failed to save resource', err);
      await dialog.showMessage({
        title: 'Save Failed',
        message: 'Could not save the resource. Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (r: SingerResource) => {
    const shouldDelete = await dialog.confirm({
      title: 'Delete Resource',
      message: `Are you sure you want to delete the resource "${r.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    try {
      await resourceService.deleteResource(r.id);
      dialog.showToast('Resource deleted.');
      await loadResources();
    } catch (err) {
      console.error('Failed to delete resource', err);
      await dialog.showMessage({
        title: 'Delete Failed',
        message: 'Could not delete the resource.',
        variant: 'danger',
      });
    }
  };

  const stats = useMemo(() => {
    const total = resources.length;
    const files = resources.filter(r => !r.url).length;
    const links = resources.filter(r => !!r.url).length;
    return { total, files, links };
  }, [resources]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = resources.findIndex((r) => r.id === active.id);
    const newIndex = resources.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(resources, oldIndex, newIndex);
    setResources(reordered);
    try {
      await Promise.all(
        reordered.map((r, i) => resourceService.updateResource(r.id, { sortOrder: i }))
      );
    } catch (err) {
      console.error('Failed to save reorder', err);
      await loadResources();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Singer Resources
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Upload documents or reference URLs for active singers to view on their dashboard.
          </p>
        </div>
        <div className="mt-1 flex-shrink-0">
          <Button onClick={() => setIsAdding(true)} variant="primary">
            + New Resource
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Total Resources
          </p>
          <p className="mt-2 text-3xl font-bold text-text">
            {stats.total}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Files
          </p>
          <p className="mt-2 text-3xl font-bold text-text">
            {stats.files}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Links
          </p>
          <p className="mt-2 text-3xl font-bold text-text">
            {stats.links}
          </p>
        </div>
      </div>

      <Modal
        isOpen={isAdding}
        onClose={resetForm}
        title={editingId ? 'Edit Resource' : 'Create New Resource'}
        maxWidth="500px"
        footer={
          <div className="flex flex-row gap-4">
            <Button type="button" onClick={resetForm} disabled={isSaving} variant="ghost">Cancel</Button>
            <Button type="submit" form="resource-form" disabled={isSaving} variant="primary">
              {isSaving ? 'Saving...' : 'Save Resource'}
            </Button>
          </div>
        }
      >
        <form id="resource-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Resource Title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Choir Singer Handbook"
            />
          </FormField>

          <FormField label="Resource Type">
            <div className="mt-1 flex items-center gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="resourceType"
                  checked={resourceType === 'file'}
                  onChange={() => setResourceType('file')}
                  className="size-4 accent-primary"
                />
                File Upload
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input
                  type="radio"
                  name="resourceType"
                  checked={resourceType === 'link'}
                  onChange={() => setResourceType('link')}
                  className="size-4 accent-primary"
                />
                Link URL
              </label>
            </div>
          </FormField>

          {resourceType === 'file' ? (
            <FormField label="File Upload" required={!editingId}>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required={!editingId}
                className="file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
              />
              <span className="mt-1 block text-xs text-text-muted">Supports PDF, Word, Excel, Images, etc. Max 10MB.</span>
            </FormField>
          ) : (
            <FormField label="Link URL" required>
              <Input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="drive.google.com/..."
              />
              <span className="mt-1 block text-xs text-text-muted">Enter a link URL. https:// will be prepended if missing.</span>
            </FormField>
          )}
        </form>
      </Modal>

      <AppCard>
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="w-10 px-2 py-3 text-center text-xs font-semibold tracking-wide text-text-muted uppercase">
                  <span className="text-slate-300">⣿</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Resource Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Destination / Link
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {isLoading && resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                    Loading resources...
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>No resources uploaded yet.</span>
                      <Button onClick={() => setIsAdding(true)} variant="primary" size="small">
                        + New Resource
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={resources.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {resources.map(r => (
                      <SortableResourceRow
                        key={r.id}
                        resource={r}
                        dragHandle={
                          <div className="inline-flex cursor-grab items-center p-1 text-slate-400 select-none hover:text-slate-600">
                            <span className="text-lg leading-none">⣿</span>
                          </div>
                        }
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-text">
                          {r.title}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge tone={r.url ? 'neutral' : 'rehearsal'}>
                            {r.url ? 'Link' : 'File'}
                          </Badge>
                        </td>
                        <td className="max-w-xs truncate px-6 py-4 text-sm text-text-muted">
                          {r.url ? (
                            <a 
                              href={r.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {r.url}
                            </a>
                          ) : (
                            <a 
                              href={resourceService.getResourceFileUrl(r, r.file || '')} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {r.file || 'Download File'}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleEdit(r)} 
                              variant="ghost" 
                              size="small"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => handleDelete(r)}
                              variant="danger"
                              size="small"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </SortableResourceRow>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </tbody>
          </table>
          {resources.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 text-xs text-text-muted">
              <span className="italic">Tip: Drag the ⣿ handle on any row to reorder resources. Changes are saved automatically.</span>
            </div>
          )}
        </div>
      </AppCard>
    </div>
  );
}

