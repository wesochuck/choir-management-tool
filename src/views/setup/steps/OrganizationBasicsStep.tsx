import React, { useState } from 'react';
import { FormField, Input, Select } from '../../../components/ui';
import { SetupNavigation } from '../../../components/setup/SetupNavigation';
import { useDialog } from '../../../contexts/DialogContext';
import { formatPocketBaseError } from '../../../lib/pocketbase';
import { settingsService } from '../../../services/settingsService';
import { setupService } from '../../../services/setupService';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface OrganizationBasicsStepProps {
  onSuccess: () => void;
  refreshStatus: () => Promise<void>;
}

export const OrganizationBasicsStep: React.FC<OrganizationBasicsStepProps> = ({
  onSuccess,
  refreshStatus,
}) => {
  const [choirName, setChoirName] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  );
  const [homepageUrl, setHomepageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const dialog = useDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choirName.trim()) return;

    setLoading(true);
    try {
      await Promise.all([
        settingsService.saveChoirName(choirName.trim()),
        settingsService.saveTimezone(timezone),
        settingsService.saveHomepageUrl(homepageUrl.trim()),
      ]);

      await setupService.saveProgress(['admin-account', 'organization-basics']);

      await refreshStatus();

      onSuccess();
    } catch (err: unknown) {
      void dialog.showMessage({
        title: 'Save Failed',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Enter basic details about your choir or organization. These settings can be updated later
          in Settings.
        </p>

        <FormField label="Choir / Organization Name" required>
          <Input
            type="text"
            value={choirName}
            onChange={(e) => setChoirName(e.target.value)}
            placeholder="Metropolitan Community Choir"
            disabled={loading}
            required
          />
        </FormField>

        <FormField label="Timezone" required>
          <div className="py-[3px]">
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={loading}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>
        </FormField>

        <FormField label="Homepage URL (Optional)">
          <Input
            type="url"
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
            placeholder="https://www.ourchoir.org"
            disabled={loading}
          />
        </FormField>
      </div>

      <SetupNavigation
        nextLabel="Save & Continue"
        nextDisabled={!choirName.trim()}
        loading={loading}
      />
    </form>
  );
};
