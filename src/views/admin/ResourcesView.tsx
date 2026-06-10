import React, { useState, useEffect, useCallback } from 'react';
import { resourceService, type SingerResource } from '../../services/resourceService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';

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

  if (isLoading && resources.length === 0) {
    return <div className="container text-center pt-8">Loading resources...</div>;
  }

  return (
    <div className="flex-col gap-8 py-8">
      <div className="flex-responsive justify-between items-center">
        <div>
          <h1 className="text-display m-0">Singer Resources</h1>
          <p className="text-muted text-sm">Upload documents or reference URLs for active singers to view on their dashboard.</p>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">+ New Resource</button>
        )}
      </div>

      {isAdding && (
        <AppCard title={editingId ? 'Edit Resource' : 'Create New Resource'}>
          <form onSubmit={handleSave} className="flex-col gap-4">
            <div className="flex-col gap-1">
              <label className="text-label">Resource Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Choir Singer Handbook"
                className="card w-full px-3 h-11 border border-border"
              />
            </div>

            <div className="flex-col gap-1">
              <label className="text-label">Resource Type</label>
              <div className="flex-row gap-4">
                <label className="flex-row items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="resourceType"
                    checked={resourceType === 'file'}
                    onChange={() => setResourceType('file')}
                    className="accent-primary"
                  />
                  File Upload
                </label>
                <label className="flex-row items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="resourceType"
                    checked={resourceType === 'link'}
                    onChange={() => setResourceType('link')}
                    className="accent-primary"
                  />
                  Link URL
                </label>
              </div>
            </div>

            {resourceType === 'file' ? (
              <div className="flex-col gap-1">
                <label className="text-label">File Upload</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!editingId}
                  className="card w-full p-2 border border-border"
                />
                <span className="text-xs text-muted">Supports PDF, Word, Excel, Images, etc. Max 10MB.</span>
              </div>
            ) : (
              <div className="flex-col gap-1">
                <label className="text-label">Link URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="drive.google.com/..."
                  className="card w-full px-3 h-11 border border-border"
                />
                <span className="text-xs text-muted">Enter a link URL. https:// will be prepended if missing.</span>
              </div>
            )}

            <div className="flex-col gap-1">
              <label className="text-label">Sort Order (Optional)</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="e.g. 1"
                className="card w-full px-3 h-11 border border-border"
              />
              <span className="text-xs text-muted">Lower numbers show up first on the dashboard.</span>
            </div>

            <div className="flex-responsive justify-end gap-4">
              <button type="button" onClick={resetForm} disabled={isSaving} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn btn-primary">
                {isSaving ? 'Saving...' : 'Save Resource'}
              </button>
            </div>
          </form>
        </AppCard>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
        {resources.map(r => (
          <AppCard key={r.id} title={r.title}>
            <div className="flex-col gap-1 min-h-[60px]">
              <div className="text-body">
                <span className="text-muted">Type:</span>{' '}
                {r.url ? '🔗 Link' : '📄 File Upload'}
              </div>
              {r.url ? (
                <div className="text-body text-xs text-muted break-all">
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.url}
                  </a>
                </div>
              ) : (
                <div className="text-body text-xs text-muted">
                  <a href={resourceService.getResourceFileUrl(r, r.file || '')} target="_blank" rel="noopener noreferrer">
                    📂 Download Uploaded File
                  </a>
                </div>
              )}
              <div className="text-body">
                <span className="text-muted">Sort Order:</span> {r.sortOrder || 0}
              </div>
            </div>
            <div className="flex-responsive gap-4 mt-4">
              <button onClick={() => handleEdit(r)} className="btn btn-ghost expanded-hit-area flex-1">Edit</button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(r);
                }}
                className="btn btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </AppCard>
        ))}
      </div>

      {resources.length === 0 && !isAdding && (
        <AppCard className="p-8 text-center">
          <p className="text-muted">No resources uploaded yet.</p>
        </AppCard>
      )}
    </div>
  );
}
