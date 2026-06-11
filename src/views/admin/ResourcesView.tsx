import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { resourceService, type SingerResource } from '../../services/resourceService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { Button, Input, FormField, Badge } from '../../components/ui';

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
  const [sortOrder, setSortOrder] = useState<string>('');
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
    setSortOrder(r.sortOrder !== undefined ? String(r.sortOrder) : '');
    setIsAdding(true);
  };

  const resetForm = () => {
    setTitle('');
    setResourceType('file');
    setUrl('');
    setFile(null);
    setSortOrder('');
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
      formData.append('sortOrder', sortOrder ? String(Number(sortOrder)) : '0');

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Singer Resources
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Upload documents or reference URLs for active singers to view on their dashboard.
          </p>
        </div>
        {!isAdding && (
          <div className="flex-shrink-0 mt-1">
            <Button onClick={() => setIsAdding(true)} variant="primary">
              + New Resource
            </Button>
          </div>
        )}
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

      {isAdding && (
        <AppCard title={editingId ? 'Edit Resource' : 'Create New Resource'}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <FormField label="Resource Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Choir Singer Handbook"
              />
            </FormField>

            <FormField label="Resource Type">
              <div className="flex items-center gap-6 mt-1">
                <label className="cursor-pointer flex items-center gap-2 text-sm text-text">
                  <input
                    type="radio"
                    name="resourceType"
                    checked={resourceType === 'file'}
                    onChange={() => setResourceType('file')}
                    className="accent-primary h-4 w-4"
                  />
                  File Upload
                </label>
                <label className="cursor-pointer flex items-center gap-2 text-sm text-text">
                  <input
                    type="radio"
                    name="resourceType"
                    checked={resourceType === 'link'}
                    onChange={() => setResourceType('link')}
                    className="accent-primary h-4 w-4"
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
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <span className="text-text-muted text-xs block mt-1">Supports PDF, Word, Excel, Images, etc. Max 10MB.</span>
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
                <span className="text-text-muted text-xs block mt-1">Enter a link URL. https:// will be prepended if missing.</span>
              </FormField>
            )}

            <FormField label="Sort Order (Optional)">
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="e.g. 1"
              />
              <span className="text-text-muted text-xs block mt-1">Lower numbers show up first on the dashboard.</span>
            </FormField>

            <div className="flex justify-end gap-3 mt-4">
              <Button type="button" onClick={resetForm} disabled={isSaving} variant="ghost">Cancel</Button>
              <Button type="submit" disabled={isSaving} variant="primary">
                {isSaving ? 'Saving...' : 'Save Resource'}
              </Button>
            </div>
          </form>
        </AppCard>
      )}

      <AppCard>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-slate-50/50">
              <tr>
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
                  Sort Order
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
                    No resources uploaded yet.
                  </td>
                </tr>
              ) : (
                resources.map(r => (
                  <tr 
                    key={r.id} 
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-text">
                      {r.title}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Badge tone={r.url ? 'neutral' : 'rehearsal'}>
                        {r.url ? 'Link' : 'File'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-muted max-w-xs truncate">
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
                    <td className="px-6 py-4 text-right text-sm text-text-muted">
                      {r.sortOrder || 0}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AppCard>
    </div>
  );
}

