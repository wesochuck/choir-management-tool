import React, { useState, useEffect } from 'react';
import type { Profile, ProfileInput } from '../../services/profileService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { formatPocketBaseError } from '../../lib/pocketbase';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileInput) => Promise<void>;
  onDelete?: (profile: Profile) => Promise<void>;
  initialData?: Profile | null;
}

export const SingerModal: React.FC<SingerModalProps> = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
  const dialog = useDialog();
  const [formData, setFormData] = useState<ProfileInput>({
    name: '',
    email: '',
    password: '',
    phone: '',
    voicePart: 'S1',
    globalStatus: 'Active (Current)',
    notes: '',
  });
  const [isSubmitting, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        email: initialData.expand?.user?.email || '',
        password: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        voicePart: 'S1',
        globalStatus: 'Active (Current)',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      await dialog.showMessage({
        title: 'Could Not Save Singer',
        message: formatPocketBaseError(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const shouldDelete = await dialog.confirm({
      title: 'Delete Singer',
      message: `Delete ${initialData.name} from the roster and remove their login?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(initialData);
      onClose();
    } catch {
      await dialog.showMessage({
        title: 'Could Not Delete Singer',
        message: 'Error deleting singer',
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Singer' : 'Add Singer'}
      footer={
        <>
          {initialData && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
            >
              {isDeleting ? 'Deleting...' : 'Delete Singer'}
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button 
            type="submit" 
            form="singer-form"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <form id="singer-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Name</label>
          <input 
            value={formData.name || ''} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            required
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          />
        </div>
        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Login Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">{initialData?.user ? 'New Password' : 'Temporary Password'}</label>
            <input
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!initialData?.user}
              minLength={8}
              placeholder={initialData?.user ? 'Leave blank to keep current' : 'At least 8 characters'}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Phone</label>
          <input 
            value={formData.phone || ''} 
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
          />
        </div>
        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Voice Part</label>
            <select 
              value={formData.voicePart} 
              onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as any })}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            >
              {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
            <label className="text-label">Status</label>
            <select 
              value={formData.globalStatus} 
              onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as any })}
              className="card"
              style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            >
              <option value="Active (Current)">Active (Current)</option>
              <option value="Active (Future)">Active (Future)</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
          <label className="text-label">Notes</label>
          <textarea 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
            className="card"
            style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '100px', resize: 'vertical' }}
          />
        </div>
      </form>
    </BaseModal>
  );
};
