interface SavingIndicatorProps {
  isSaving: boolean;
  error: string | null;
}

export function SavingIndicator({ isSaving, error }: SavingIndicatorProps) {
  if (error) {
    return (
      <span className="text-label text-danger-text">
        Save failed
      </span>
    );
  }

  if (isSaving) {
    return <span className="text-label text-muted">Saving...</span>;
  }

  return null;
}
