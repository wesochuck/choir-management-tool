import type { Dispatch, SetStateAction, RefObject } from 'react';
import { PhotoUploader } from '../../common/PhotoUploader';
import { pb } from '../../../lib/pocketbase';
import { Input, Select, Checkbox, Textarea } from '../../ui';
import type { Profile, ProfileInput } from '../../../services/profileService';
import { SingerPasswordReset } from './SingerPasswordReset';

interface SingerProfileFormProps {
  formData: ProfileInput;
  setFormData: Dispatch<SetStateAction<ProfileInput>>;
  voiceParts: { label: string; fullName?: string; sectionCode?: string }[];
  initialData?: Profile | null;
  isSelf: boolean;
  emailInputRef: RefObject<HTMLInputElement | null>;
  validateEmailField: () => boolean;
  handleEmailChange: (value: string) => void;
  handleResetPassword: () => Promise<void>;
  resetFeedback: string | null;
  isResettingPassword: boolean;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
}

export function SingerProfileForm({
  formData,
  setFormData,
  voiceParts,
  initialData,
  isSelf,
  emailInputRef,
  validateEmailField,
  handleEmailChange,
  handleResetPassword,
  resetFeedback,
  isResettingPassword,
  handleSubmit,
}: SingerProfileFormProps) {
  return (
    <form id="singer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1">
        {initialData ? (
          <PhotoUploader
            profileId={initialData.id}
            profileName={initialData.name}
            currentPhotoUrl={
              initialData.photo ? pb.files.getURL(initialData, initialData.photo) : undefined
            }
            size="md"
            onSuccess={(updated) => {
              setFormData((prev) => ({
                ...prev,
                photo: updated.photo,
              }));
            }}
          />
        ) : (
          <>
            <div className="border-border bg-bg text-text-muted flex size-24 items-center justify-center rounded-full border-2 border-dashed text-4xl">
              ?
            </div>
            <span className="text-muted text-xs">Save first to add a photo</span>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-label">Name</label>
        <Input
          className="w-full"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-label">Login Email (Optional)</label>
          <Input
            ref={emailInputRef}
            className="w-full"
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={validateEmailField}
            placeholder="e.g. singer@example.com"
          />
          <p className="text-muted m-0 text-xs">
            {initialData?.user
              ? 'Clearing this removes their login account.'
              : 'Provides portal access via password reset email.'}
          </p>
          {initialData?.user && formData.email && (
            <SingerPasswordReset
              onReset={handleResetPassword}
              isResetting={isResettingPassword}
              feedback={resetFeedback}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-label">Phone (Optional)</label>
          <Input
            className="w-full"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g. 555-123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-label">Voice Part</label>
          <Select
            className="w-full"
            value={formData.voicePart}
            onChange={(e) =>
              setFormData({
                ...formData,
                voicePart: e.target.value as Profile['voicePart'],
              })
            }
            required={formData.role !== 'admin'}
          >
            {formData.role === 'admin' ? (
              <option value="">-- Not Applicable (Admin) --</option>
            ) : (
              <option value="" disabled>
                -- Please Select --
              </option>
            )}
            {voiceParts.map((v) => (
              <option key={v.label} value={v.label}>
                {v.label} {v.fullName ? `(${v.fullName})` : ''}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-label">Status</label>
          <Select
            className="w-full"
            value={formData.globalStatus}
            onChange={(e) =>
              setFormData({
                ...formData,
                globalStatus: e.target.value as Profile['globalStatus'],
              })
            }
          >
            <option value="Active">Active</option>
            <option value="Idle">Idle</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 gap-x-4">
        <Checkbox
          checked={formData.doNotEmail}
          onChange={(e) => setFormData({ ...formData, doNotEmail: e.target.checked })}
        >
          Do Not Email
        </Checkbox>
        <Checkbox
          checked={formData.statusIsManual}
          onChange={(e) => setFormData({ ...formData, statusIsManual: e.target.checked })}
        >
          Lock Status (Disable Automation)
        </Checkbox>
        <Checkbox
          checked={Boolean(formData.isSectionLeader)}
          onChange={(e) => setFormData({ ...formData, isSectionLeader: e.target.checked })}
        >
          Section Leader
        </Checkbox>
        <Checkbox
          checked={formData.showInDirectory !== false}
          onChange={(e) => setFormData({ ...formData, showInDirectory: e.target.checked })}
        >
          Show in Singer Directory
        </Checkbox>
        {initialData && formData.role === 'admin' && (
          <>
            <Checkbox
              checked={formData.receiveAttendanceReports !== false}
              onChange={(e) =>
                setFormData({ ...formData, receiveAttendanceReports: e.target.checked })
              }
            >
              Receive Attendance Reports
            </Checkbox>
            <Checkbox
              checked={Boolean(formData.receiveRsvpDeclineNotices)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  receiveRsvpDeclineNotices: e.target.checked,
                })
              }
            >
              Receive RSVP Decline Notices
            </Checkbox>
            <Checkbox
              checked={formData.receiveAdminNotifications !== false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  receiveAdminNotifications: e.target.checked,
                })
              }
            >
              Receive General Admin Notifications
            </Checkbox>
          </>
        )}
        {initialData &&
          (formData.email?.trim() ? (
            <Checkbox
              checked={formData.role === 'admin'}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.checked ? 'admin' : 'singer' })
              }
              disabled={Boolean(isSelf)}
              title={
                isSelf
                  ? 'You cannot remove your own administrator permissions to prevent accidental lockout.'
                  : undefined
              }
              className={isSelf ? 'cursor-not-allowed opacity-60' : ''}
            >
              Administrator
            </Checkbox>
          ) : (
            <div />
          ))}
        <p className="text-muted col-span-2 m-0 text-xs">
          When enabled, logged-in singers can see this singer's name, photo, voice part, email, and
          phone number.
        </p>
      </div>

      {initialData?.statusLastChangedAt && (
        <div className="border-border bg-bg flex flex-row flex-wrap justify-between gap-[4px_12px] rounded-xl border p-[6px_10px] shadow-none">
          <div className="text-muted m-0 text-xs">
            <strong>Status Changed:</strong>{' '}
            {new Date(initialData.statusLastChangedAt).toLocaleDateString()}
          </div>
          <div className="text-muted m-0 text-xs">
            <strong>Reason:</strong> {initialData.statusChangeReason || 'Manual update'}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-label">Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>
    </form>
  );
}
