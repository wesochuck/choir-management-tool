import React from 'react';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { Modal, Button } from '../ui';
import { getProfileEmail, type Profile } from '../../services/profileService';

interface AttendanceSingerActionsSheetProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: (profile: Profile) => void;
}

// ponytail: keep helper simple and localized
function normalizePhoneHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export const AttendanceSingerActionsSheet: React.FC<AttendanceSingerActionsSheetProps> = ({
  profile,
  isOpen,
  onClose,
  onViewProfile,
}) => {
  const { performerLabel } = useChoirSettings();
  const email = profile ? getProfileEmail(profile) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      asDrawer
      maxWidth="400px"
      title={
        profile ? (
          <div>
            <div className="text-lg font-bold text-gray-900">{profile.name}</div>
            <div className="text-xs font-medium text-gray-500">
              {profile.voicePart || 'No Voice Part'}
            </div>
          </div>
        ) : (
          ''
        )
      }
    >
      {profile && (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            {profile.phone ? (
              <>
                <Button
                  as="a"
                  href={`tel:${normalizePhoneHref(profile.phone)}`}
                  className="w-full justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  Call {profile.phone}
                </Button>
                <Button
                  as="a"
                  href={`sms:${normalizePhoneHref(profile.phone)}`}
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  Text {profile.phone}
                </Button>
              </>
            ) : null}

            {email ? (
              <Button
                as="a"
                href={`mailto:${email}`}
                variant="secondary"
                className="w-full justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                Email {email}
              </Button>
            ) : null}

            {!profile.phone && !email && (
              <p className="my-2 text-center text-sm text-gray-500">
                No contact information is listed for this {performerLabel.toLowerCase()}.
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(profile);
              }}
              className="w-full justify-center"
            >
              View/Edit {performerLabel} Profile
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full justify-center"
          >
            Cancel
          </Button>
        </div>
      )}
    </Modal>
  );
};
