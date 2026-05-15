import React, { useState, useEffect } from 'react';
import type { Profile } from '../../services/profileService';

interface SingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Profile>) => Promise<void>;
  initialData?: Profile | null;
}

export const SingerModal: React.FC<SingerModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    phone: '',
    voicePart: 'S1',
    globalStatus: 'Active (Current)',
    notes: '',
  });
  const [isSubmitting, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        phone: '',
        voicePart: 'S1',
        globalStatus: 'Active (Current)',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      alert('Error saving profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '90%', maxWidth: '500px' }}>
        <h2>{initialData ? 'Edit Singer' : 'Add Singer'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Name</label>
            <input 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Phone</label>
            <input 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Voice Part</label>
              <select 
                value={formData.voicePart} 
                onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as any })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Status</label>
              <select 
                value={formData.globalStatus} 
                onChange={(e) => setFormData({ ...formData, globalStatus: e.target.value as any })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              >
                <option value="Active (Current)">Active (Current)</option>
                <option value="Active (Future)">Active (Future)</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px' }}>Notes</label>
            <textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', height: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none' }}>Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '8px 16px', borderRadius: '4px', backgroundColor: '#3182ce', color: 'white', border: 'none' }}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
