import React, { useState, useRef } from 'react';
import { Modal, Button, Select, ProgressBar } from '../ui';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../lib/labelHelpers';
import { useDialog } from '../../contexts/DialogContext';
import { profileService, generateRandomPassword } from '../../services/profileService';
import {
  parseCSV,
  suggestFieldMapping,
  validateAndMapSingers,
  type CSVData,
  type FieldMapping,
  type MappedSinger,
  type RosterField,
} from '../../lib/rosterImportUtils';
import { useVoiceParts } from '../../hooks/useVoiceParts';

interface RosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type ImportStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'IMPORTING' | 'COMPLETE';

interface CreatedCredential {
  name: string;
  email: string;
  password?: string;
}

export const RosterImportModal: React.FC<RosterImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dialog = useDialog();
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { labels: voicePartLabels } = useVoiceParts();

  // Wizard state
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mapping, setMapping] = useState<FieldMapping>({
    name: -1,
    email: -1,
    phone: -1,
    voicePart: -1,
    globalStatus: -1,
    notes: -1,
  });
  const [mappedSingers, setMappedSingers] = useState<MappedSinger[]>([]);

  // Execution progress
  const [importProgress, setImportProgress] = useState(0);
  const [importingIndex, setImportingIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorsList, setErrorsList] = useState<{ row: number; name: string; error: string }[]>([]);
  const [credentialsList, setCredentialsList] = useState<CreatedCredential[]>([]);

  // 1. Handlers for Upload Step
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error('The CSV file appears to be empty.');
      }

      setCsvData(parsed);

      // Auto-suggest mapping based on headers
      const suggested = suggestFieldMapping(parsed.headers);
      setMapping(suggested);

      setStep('MAP');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Upload Error',
        message: err instanceof Error ? err.message : 'Could not parse the CSV file.',
        variant: 'danger',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 2. Handlers for Mapping Step
  const handleMappingChange = (field: RosterField, index: number) => {
    setMapping((prev) => ({ ...prev, [field]: index }));
  };

  const handleApplyMapping = () => {
    if (!csvData) return;

    // Verify Name is mapped as it is required
    if (mapping.name === -1) {
      dialog.showMessage({
        title: 'Mapping Required',
        message: 'You must map a column to the "Name" field as it is required to create a profile.',
        variant: 'danger',
      });
      return;
    }

    const singers = validateAndMapSingers(csvData, mapping, voicePartLabels);
    setMappedSingers(singers);
    setStep('PREVIEW');
  };

  // 3. Handlers for Preview Step
  const handleStartImport = async () => {
    if (!csvData) return;

    const validSingers = mappedSingers.filter((s) => s.isValid);
    if (validSingers.length === 0) {
      await dialog.showMessage({
        title: 'No Valid Records',
        message:
          'There are no valid records to import. Please check your field mapping or fix errors.',
        variant: 'danger',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Confirm Import',
      message: `Ready to import ${validSingers.length} singers? ${
        mappedSingers.length - validSingers.length > 0
          ? `${mappedSingers.length - validSingers.length} invalid rows will be skipped.`
          : ''
      }`,
      confirmLabel: 'Import Now',
    });

    if (!confirmed) return;

    setStep('IMPORTING');
    setImportProgress(0);
    setImportingIndex(0);
    setSuccessCount(0);
    setErrorsList([]);
    setCredentialsList([]);

    // Run import sequentially to show live progress and handle partial success robustly
    let successes = 0;
    const errors: typeof errorsList = [];
    const credentials: typeof credentialsList = [];

    // @allow-sequential-await - Import runs sequentially to show live progress and handle partial success robustly.
    for (let i = 0; i < mappedSingers.length; i++) {
      const singer = mappedSingers[i];
      if (!singer.isValid) continue;

      setImportingIndex(i + 1);

      try {
        const payload: Parameters<typeof profileService.createProfile>[0] = {
          name: singer.data.name,
          phone: singer.data.phone,
          voicePart: singer.data.voicePart || undefined,
          globalStatus: singer.data.globalStatus,
          notes: singer.data.notes,
        };

        let generatedPassword: string | undefined = undefined;
        if (singer.data.email) {
          generatedPassword = generateRandomPassword();
          payload.email = singer.data.email;
          payload.password = generatedPassword;
        }

        await profileService.createProfile(payload);
        successes++;
        setSuccessCount(successes);

        if (singer.data.email) {
          credentials.push({
            name: singer.data.name,
            email: singer.data.email,
            password: generatedPassword,
          });
        }
      } catch (err: unknown) {
        console.error(`Import failed for row ${singer.rowNumber}:`, err);
        errors.push({
          row: singer.rowNumber,
          name: singer.data.name || 'Unknown Singer',
          error: err instanceof Error ? err.message : 'Unknown database error',
        });
        setErrorsList([...errors]);
      }

      setImportProgress(Math.round(((i + 1) / mappedSingers.length) * 100));
    }

    setCredentialsList(credentials);
    setStep('COMPLETE');
    dialog.showToast(`Roster import finished: ${successes} singers added.`);
    await onSuccess();
  };

  // 4. Download Credentials CSV Helper
  const handleDownloadCredentials = () => {
    if (credentialsList.length === 0) return;

    const headers = ['Name', 'Email', 'Temporary Password'];
    const rows = credentialsList.map((c) => [
      c.name.includes(',') ? `"${c.name}"` : c.name,
      c.email,
      c.password || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${performerLabel.toLowerCase()}_credentials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for resetting modal states
  const handleReset = () => {
    setStep('UPLOAD');
    setCsvData(null);
    setMapping({
      name: -1,
      email: -1,
      phone: -1,
      voicePart: -1,
      globalStatus: -1,
      notes: -1,
    });
    setMappedSingers([]);
    setErrorsList([]);
    setCredentialsList([]);
  };

  const handleModalClose = () => {
    handleReset();
    onClose();
  };

  // Renders different footer buttons based on step
  const renderFooter = () => {
    switch (step) {
      case 'UPLOAD':
        return (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={handleModalClose} variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        );
      case 'MAP':
        return (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:w-auto sm:flex-row">
              <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
                Restart
              </Button>
              <Button
                onClick={() => setStep('UPLOAD')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Back
              </Button>
            </div>
            <Button onClick={handleApplyMapping} variant="primary" className="w-full sm:w-auto">
              Preview & Validate
            </Button>
          </div>
        );
      case 'PREVIEW':
        return (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setStep('MAP')} variant="outline" className="w-full sm:w-auto">
              Back
            </Button>
            <Button onClick={handleStartImport} variant="primary" className="w-full sm:w-auto">
              Confirm & Import
            </Button>
          </div>
        );
      case 'IMPORTING':
        return null; // Don't allow closing/modifying during live import
      case 'COMPLETE':
        return (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={handleModalClose} variant="primary" className="w-full sm:w-auto">
              Done
            </Button>
          </div>
        );
    }
  };

  const fieldsConfig: { key: RosterField; label: string; desc: string; required?: boolean }[] = [
    { key: 'name', label: 'Name', desc: `Full name of the ${performerLabel.toLowerCase()}`, required: true },
    { key: 'email', label: 'Email', desc: 'Enables user login if provided' },
    { key: 'phone', label: 'Phone', desc: 'Contact phone number' },
    {
      key: 'voicePart',
      label: 'Voice Part',
      desc: 'S1, A2, etc. (should match your configured parts)',
    },
    { key: 'globalStatus', label: 'Global Status', desc: 'Active, On Break, or Inactive' },
    { key: 'notes', label: 'Notes', desc: 'Administrative notes' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'IMPORTING' ? () => undefined : handleModalClose}
      title={
        step === 'UPLOAD'
          ? `Import ${performerLabelPlural} via CSV`
          : step === 'MAP'
            ? 'Map CSV Columns'
            : step === 'PREVIEW'
              ? 'Preview & Validation'
              : step === 'IMPORTING'
                ? 'Importing Roster...'
                : 'Import Completed'
      }
      footer={renderFooter()}
      maxWidth={step === 'PREVIEW' || step === 'COMPLETE' ? '800px' : '520px'}
    >
      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="flex flex-col gap-4 py-5 text-center">
          <p className="text-muted m-0 text-sm">
            {`Upload a CSV file containing your ${performerLabel.toLowerCase()} roster to bootstrap the process.`}
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-border flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-[rgb(74_124_89_/_2%)] p-[40px_20px] transition-[border-color,background-color] duration-200"
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.02)';
            }}
          >
            <span className="text-5xl">📄</span>
            <div>
              <strong className="text-primary-deep block text-base">
                Select a CSV file to upload
              </strong>
              <span className="text-muted mt-1 block text-xs">or drag & drop it here</span>
            </div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="text-text-muted flex items-center justify-center gap-2 text-xs">
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex flex-col gap-4">
          <p className="text-muted m-0 text-sm">
            Align the columns in your CSV with our system database fields. Smart auto-matches have
            been pre-selected.
          </p>

          <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto px-1">
            {fieldsConfig.map((field) => {
              const selectedIndex = mapping[field.key];

              return (
                <div
                  key={field.key}
                  className={`bg-surface flex flex-row items-center justify-between gap-3 rounded-xl border p-3 px-4 ${field.required && selectedIndex === -1 ? 'border-red-300' : 'border-border'}`}
                >
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-[6px]">
                      <strong className="text-text text-sm">{field.label}</strong>
                      {field.required && (
                        <span className="text-danger-text rounded bg-[rgb(153_27_27_/_10%)] px-[6px] py-[1px] text-[0.7rem] font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-xs">{field.desc}</span>
                  </div>

                  <Select
                    value={selectedIndex}
                    onChange={(e) => handleMappingChange(field.key, parseInt(e.target.value))}
                    size="small"
                    className="!w-[200px]"
                    // @allow-inline-style - Shoelace CSS custom property for input border color (must be inline; cannot be expressed via className)
                    style={
                      selectedIndex !== -1
                        ? ({
                            '--sl-input-border-color': 'var(--color-primary)',
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <option value={-1}>-- Skip / Do Not Map --</option>
                    {csvData.headers.map((hdr, idx) => (
                      <option key={idx} value={idx}>
                        Column: "{hdr}"
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATION */}
      {step === 'PREVIEW' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-muted m-0 text-sm">
              {`Verify parsed ${performerLabel.toLowerCase()} details and resolve validation warnings or errors before
              importing.`}
            </p>
            <div className="flex gap-3">
              <span className="border-primary/20 text-primary-deep rounded-md border bg-[rgb(74_124_89_/_5%)] px-2 py-1 text-xs font-semibold">
                Total Mapped: {mappedSingers.length}
              </span>
              <span className="border-danger-text/20 text-danger-text rounded-md border bg-[rgb(153_27_27_/_5%)] px-2 py-1 text-xs font-semibold">
                Errors: {mappedSingers.filter((s) => !s.isValid).length}
              </span>
            </div>
          </div>

          <div className="border-border max-h-[350px] overflow-x-auto rounded-lg border">
            <table className="m-0 table w-full min-w-[600px]">
              <thead className="bg-bg sticky top-0 z-[1] shadow-[0_1px_0_var(--color-border)]">
                <tr>
                  <th className="w-[60px] text-center">Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="w-[100px]">Voice Part</th>
                  <th className="w-[130px]">Status</th>
                  <th>Status / Errors</th>
                </tr>
              </thead>
              <tbody>
                {mappedSingers.map((singer, idx) => {
                  const hasErrors = !singer.isValid;
                  const hasWarnings = singer.warnings.length > 0;

                  return (
                    <tr
                      key={idx}
                      className={hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-amber-50' : ''}
                    >
                      <td className="text-text-muted text-center text-xs">{singer.rowNumber}</td>
                      <td>
                        <strong className={hasErrors ? 'text-danger' : ''}>
                          {singer.data.name || '(Empty Name)'}
                        </strong>
                      </td>
                      <td className="text-sm">{singer.data.email || '-'}</td>
                      <td className="text-center">
                        <span className="text-xs font-semibold">
                          {singer.data.voicePart || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="border-border bg-bg inline-block rounded border p-[2px_6px] text-xs">
                          {singer.data.globalStatus}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div className="text-danger flex flex-col gap-0.5 text-xs">
                            {singer.errors.map((e, i) => (
                              <span key={i}>❌ {e}</span>
                            ))}
                          </div>
                        )}
                        {hasWarnings && (
                          <div className="text-warning-text flex flex-col gap-0.5 text-xs">
                            {singer.warnings.map((w, i) => (
                              <span key={i}>⚠️ {w}</span>
                            ))}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span className="text-primary-deep text-xs">🟢 Ready</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORTING PROGRESS */}
      {step === 'IMPORTING' && (
        <div className="flex flex-col items-center gap-4 py-5">
          <span className="animate-spin text-5xl">⚙️</span>

          <div className="flex w-full flex-col items-center gap-[6px]">
            <strong className="text-text text-lg">
              Importing {mappedSingers.filter((s) => s.isValid).length} {performerLabelPlural}...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedSingers.length}
            </span>
          </div>

          <ProgressBar
            value={importProgress}
            className="mt-[10px] h-3 w-full [&::part(base)]:rounded-full"
          />

          <div className="text-text-muted flex gap-5 text-sm">
            <span>
              Successes: <strong className="text-primary-deep">{successCount}</strong>
            </span>
            <span>
              Failures:{' '}
              <strong className={errorsList.length > 0 ? 'text-danger-text' : ''}>
                {errorsList.length}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'COMPLETE' && (
        <div className="flex flex-col gap-6 py-[10px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-6xl">🎉</span>
            <h3 className="text-primary-deep m-0 text-2xl">Import Finished!</h3>
            <p className="text-muted m-0 text-sm">
              Successfully imported <strong>{successCount}</strong> {performerLabelPlural.toLowerCase()} into the roster.
            </p>
          </div>

          {/* Credentials Download Callout */}
          {credentialsList.length > 0 && (
            <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-[rgb(74_124_89_/_20%)] bg-[rgb(74_124_89_/_6%)] p-4 px-5">
              <div className="flex flex-1 flex-col gap-1">
                <strong className="text-primary-deep text-sm">
                  🔑 Generated temporary credentials
                </strong>
                <span className="text-muted text-xs leading-[1.4]">
                  Created {credentialsList.length} new login accounts. Download this CSV now to save
                  their temporary login passwords.
                </span>
              </div>
              <Button
                onClick={handleDownloadCredentials}
                variant="primary"
                className="flex h-10 items-center gap-[6px]"
              >
                📥 Download CSV
              </Button>
            </div>
          )}

          {/* Error Details */}
          {errorsList.length > 0 && (
            <div className="flex flex-col gap-1">
              <strong className="text-danger-text text-sm">
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div className="border-border bg-surface-muted max-h-[150px] overflow-y-auto rounded-lg border p-[8px_12px] text-xs">
                {errorsList.map((err, i) => (
                  <div
                    key={i}
                    className={`p-[4px_0] text-gray-600 ${i < errorsList.length - 1 ? 'border-border border-b' : ''}`}
                  >
                    Row {err.row} (<strong>{err.name}</strong>):{' '}
                    <span className="text-danger-text">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
