import { Button, Icon } from '../../ui';

interface SingerPasswordResetProps {
  onReset: () => Promise<void>;
  isResetting: boolean;
  feedback: string | null;
}

export function SingerPasswordReset({ onReset, isResetting, feedback }: SingerPasswordResetProps) {
  return (
    <div className="mt-[6px] flex flex-col items-start gap-1">
      <Button
        type="button"
        onClick={onReset}
        disabled={isResetting}
        variant="secondary"
        size="tiny"
        className="inline-flex cursor-pointer items-center gap-1"
        loading={isResetting}
      >
        <Icon name="key" className="text-xs" /> Reset Password
      </Button>
      {feedback && (
        <span
          className="text-[11px] font-semibold"
          // @allow-inline-style - dynamic feedback color from server response
          style={{
            color: feedback.startsWith('Error')
              ? 'var(--color-danger-text, #ef4444)'
              : 'var(--color-success-text, #22c55e)',
          }}
        >
          {feedback}
        </span>
      )}
    </div>
  );
}
