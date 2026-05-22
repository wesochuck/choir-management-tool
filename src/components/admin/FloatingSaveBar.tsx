
interface FloatingSaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FloatingSaveBar({ isDirty, isSaving, onSave, onDiscard }: FloatingSaveBarProps) {
  if (!isDirty) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        zIndex: 1000,
        width: 'calc(100% - 48px)',
        maxWidth: '600px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
          ⚠️ You have unsaved configuration changes.
        </span>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          type="button" 
          className="btn btn-ghost btn-sm" 
          disabled={isSaving}
          onClick={onDiscard}
        >
          Discard
        </button>
        <button 
          type="button" 
          className="btn btn-primary btn-sm" 
          disabled={isSaving}
          onClick={onSave}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
