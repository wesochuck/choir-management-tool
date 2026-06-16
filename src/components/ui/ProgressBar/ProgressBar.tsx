import SlProgressBar from '@shoelace-style/shoelace/dist/react/progress-bar/index.js';

export interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  if (process.env.NODE_ENV === 'test') {
    return (
      <div className="h-3 w-full rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary transition-all"
          // @allow-inline-style - dynamic progress width from value prop
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    );
  }

  return <SlProgressBar value={value} className={className} />;
}
