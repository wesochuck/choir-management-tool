import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { resourceService, type SingerResource } from '../../services/resourceService';
import { useDialog } from '../../contexts/DialogContext';
import { Button, Input, FormField, Badge, Modal, RadioGroup, Radio, DataTable, type ColumnDef } from '../../components/ui';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const EMPTY_RESOURCES: SingerResource[] = [];

export default function ResourcesView() {
  const queryClient = useQueryClient();
  const dialog = useDialog();

  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources.list(),
    queryFn: () => resourceService.getResources(),
    staleTime: 60_000,
  });
  const resources = resourcesQuery.data ?? EMPTY_RESOURCES;
  const isLoading = resourcesQuery.isLoading;

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<'file' | 'link'>('file');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState(false);

  const invalidateResources = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => resourceService.createResource(formData),
    onSuccess: invalidateResources,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      resourceService.updateResource(id, data),
    onSuccess: invalidateResources,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourceService.deleteResource(id),
    onSuccess: invalidateResources,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SingerResource> }) =>
      resourceService.updateResource(id, data),
    onSuccess: invalidateResources,
  });

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
    setTitleError(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!title.trim()) {
      setTitleError(true);
      dialog.showToast('Please enter a resource title.');
      return;
    }
    setTitleError(false);

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('sortOrder', '0');

      if (resourceType === 'file') {
        if (file) {
          formData.append('file', file);
        }
        formData.append('url', '');
      } else {
        let formattedUrl = url.trim();
        if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = `https://${formattedUrl}`;
        }
        formData.append('url', formattedUrl);
        formData.append('file', '');
      }

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
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
        await createMutation.mutateAsync(formData);
      }

      dialog.showToast(editingId ? 'Resource updated!' : 'Resource added!');
      resetForm();
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
      await deleteMutation.mutateAsync(r.id);
      dialog.showToast('Resource deleted.');
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
    const files = resources.filter((r) => !r.url).length;
    const links = resources.filter((r) => !!r.url).length;
    return { total, files, links };
  }, [resources]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = resources.findIndex((r) => r.id === active.id);
    const newIndex = resources.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(resources, oldIndex, newIndex);
    queryClient.setQueryData(queryKeys.resources.list(), reordered);
    try {
      await Promise.all(
        reordered.map((r, i) => reorderMutation.mutateAsync({ id: r.id, data: { sortOrder: i } }))
      );
    } catch (err) {
      console.error('Failed to save reorder', err);
      await invalidateResources();
    }
  };

  const columns: ColumnDef<SingerResource>[] = [
    {
      id: 'dragHandle',
      header: '',
      cell: () => null,
    },
    {
      id: 'title',
      header: 'Resource Title',
      accessorKey: 'title',
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'type',
      header: 'Type',
      cell: (_, row) => (
        <Badge tone={row.url ? 'neutral' : 'rehearsal'}>
          {row.url ? 'Link' : 'File'}
        </Badge>
      ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'destination',
      header: 'Destination / Link',
      cell: (_, row) =>
        row.url ? (
          <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {row.url}
          </a>
        ) : (
          <a href={resourceService.getResourceFileUrl(row, row.file || '')}
             target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {row.file || 'Download File'}
          </a>
        ),
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Link',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => handleEdit(row)} variant="outline" size="small">
            Edit
          </Button>
          <Button onClick={() => handleDelete(row)} variant="danger" size="small">
            Delete
          </Button>
        </div>
      ),
      align: 'right',
      cardSection: 1,
      cardSide: 'right',
    },
  ];

  function SortableRow({ row }: { row: SingerResource }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: row.id,
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition || undefined,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <tr
        ref={setNodeRef}
        {...attributes}
        // @allow-inline-style - dnd-kit transform/transition/opacity
        style={style}
        className="border-b border-slate-100 transition-colors hover:bg-slate-50/50"
      >
        <td className="w-10 px-4 py-2.5 text-center" {...listeners}>
          <div className="inline-flex cursor-grab items-center p-1 text-slate-400 select-none hover:text-slate-600">
            <span className="text-lg leading-none">⣿</span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm font-semibold text-slate-900">{row.title}</td>
        <td className="px-4 py-2.5 text-sm">
          <Badge tone={row.url ? 'neutral' : 'rehearsal'}>
            {row.url ? 'Link' : 'File'}
          </Badge>
        </td>
        <td className="max-w-xs truncate px-4 py-2.5 text-sm text-slate-500">
          {row.url ? (
            <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {row.url}
            </a>
          ) : (
            <a href={resourceService.getResourceFileUrl(row, row.file || '')}
               target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {row.file || 'Download File'}
            </a>
          )}
        </td>
        <td className="px-4 py-2.5 text-right text-sm">
          <div className="flex justify-end gap-2">
            <Button onClick={() => handleEdit(row)} variant="outline" size="small">
              Edit
            </Button>
            <Button onClick={() => handleDelete(row)} variant="danger" size="small">
              Delete
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Singer Resources</h1>
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
        <div className="border-border bg-surface rounded-xl border px-6 py-5 shadow-sm">
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
            Total Resources
          </p>
          <p className="text-text mt-2 text-3xl font-bold">{stats.total}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border px-6 py-5 shadow-sm">
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">Files</p>
          <p className="text-text mt-2 text-3xl font-bold">{stats.files}</p>
        </div>

        <div className="border-border bg-surface rounded-xl border px-6 py-5 shadow-sm">
          <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">Links</p>
          <p className="text-text mt-2 text-3xl font-bold">{stats.links}</p>
        </div>
      </div>

      <Modal
        isOpen={isAdding}
        onClose={resetForm}
        title={editingId ? 'Edit Resource' : 'Create New Resource'}
        maxWidth="500px"
        footer={
          <div className="flex flex-row gap-4">
            <Button type="button" onClick={resetForm} disabled={isSaving} variant="outline">
              Cancel
            </Button>
            <Button disabled={isSaving} variant="primary" onClick={() => handleSave()}>
              {isSaving ? 'Saving...' : 'Save Resource'}
            </Button>
          </div>
        }
      >
        <form id="resource-form" onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Resource Title" required error={titleError ? 'Title is required' : undefined}>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
              required
              placeholder="e.g. Choir Singer Handbook"
            />
          </FormField>

          <FormField label="Resource Type">
            <div className="mt-1 flex items-center gap-6">
              <RadioGroup
                value={resourceType}
                onChange={(value) => setResourceType(value as 'file' | 'link')}
              >
                <Radio value="file">File Upload</Radio>
                <Radio value="link">Link</Radio>
              </RadioGroup>
            </div>
          </FormField>

          {resourceType === 'file' ? (
            <FormField label="File Upload" required={!editingId}>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required={!editingId}
                className="file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
              />
              <span className="text-text-muted mt-1 block text-xs">
                Supports PDF, Word, Excel, Images, etc. Max 10MB.
              </span>
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
              <span className="text-text-muted mt-1 block text-xs">
                Enter a link URL. https:// will be prepended if missing.
              </span>
            </FormField>
          )}
        </form>
      </Modal>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={resources.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <DataTable
            columns={columns}
            data={resources}
            isLoading={isLoading}
            emptyState={{
              title: 'No resources uploaded yet.',
              icon: '📄',
              action: (
                <Button onClick={() => setIsAdding(true)} variant="primary">
                  + New Resource
                </Button>
              ),
            }}
            manualPagination
            renderRow={SortableRow}
          />
        </SortableContext>
      </DndContext>
      {resources.length > 0 && (
        <div className="text-text-muted flex items-center justify-between px-4 py-2 text-xs">
          <span className="italic">
            Tip: Drag the ⣿ handle on any row to reorder resources. Changes are saved
            automatically.
          </span>
        </div>
      )}
    </div>
  );
}
