import type { Profile } from '../../../services/profileService';
import { Button } from '../../ui';

interface SingerModalFooterProps {
  activeTab: string;
  initialData?: Profile | null;
  onDelete?: (profile: Profile) => Promise<void>;
  handleDelete: () => Promise<void>;
  isDeleting: boolean;
  handleClose: () => Promise<void>;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

export function SingerModalFooter({
  activeTab,
  initialData,
  onDelete,
  handleDelete,
  isDeleting,
  handleClose,
  handleSubmit,
  isSubmitting,
}: SingerModalFooterProps) {
  if (activeTab !== 'profile') {
    return (
      <Button type="button" onClick={handleClose} variant="primary" className="w-full sm:w-auto">
        Close
      </Button>
    );
  }

  if (initialData && onDelete) {
    return (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:w-auto sm:flex-row">
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            variant="danger"
            loading={isDeleting}
            className="w-full sm:w-auto"
          >
            Delete Singer
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
        <Button
          disabled={isSubmitting}
          variant="primary"
          loading={isSubmitting}
          className="w-full sm:w-auto"
          onClick={() => handleSubmit()}
        >
          Save Changes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" onClick={handleClose} variant="outline" className="w-full sm:w-auto">
        Cancel
      </Button>
      <Button
        disabled={isSubmitting}
        variant="primary"
        loading={isSubmitting}
        className="w-full sm:w-auto"
        onClick={() => handleSubmit()}
      >
        Save Changes
      </Button>
    </div>
  );
}
