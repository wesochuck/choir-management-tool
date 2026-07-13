import React from 'react';
import { Button } from '../ui';

interface SetupNavigationProps {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  loading?: boolean;
}

export const SetupNavigation: React.FC<SetupNavigationProps> = ({
  onNext,
  onBack,
  nextLabel = 'Continue',
  backLabel = 'Back',
  nextDisabled = false,
  backDisabled = false,
  loading = false,
}) => {
  return (
    <div className="border-border mt-8 flex items-center justify-between border-t pt-6">
      <div>
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={backDisabled || loading}
          >
            <span>{backLabel}</span>
          </Button>
        )}
      </div>
      <div>
        <Button
          type={onNext ? 'button' : 'submit'}
          variant="primary"
          onClick={onNext}
          disabled={nextDisabled}
          loading={loading}
        >
          <span>{nextLabel}</span>
          {!loading && (
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};
