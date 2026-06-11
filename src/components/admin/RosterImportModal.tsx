import React, { useState, useRef } from 'react';
import { Modal } from '../ui';
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
    setMapping(prev => ({ ...prev, [field]: index }));
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

    const validSingers = mappedSingers.filter(s => s.isValid);
    if (validSingers.length === 0) {
      await dialog.showMessage({
        title: 'No Valid Records',
        message: 'There are no valid records to import. Please check your field mapping or fix errors.',
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
    const rows = credentialsList.map(c => [
      c.name.includes(',') ? `"${c.name}"` : c.name,
      c.email,
      c.password || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'singer_credentials.csv');
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
          <>
            <button onClick={handleModalClose} className="btn btn-ghost">Cancel</button>
          </>
        );
      case 'MAP':
        return (
          <>
            <button onClick={handleReset} className="btn btn-ghost mr-auto">Restart</button>
            <button onClick={() => setStep('UPLOAD')} className="btn btn-ghost">Back</button>
            <button onClick={handleApplyMapping} className="btn btn-primary">Preview & Validate</button>
          </>
        );
      case 'PREVIEW':
        return (
          <>
            <button onClick={() => setStep('MAP')} className="btn btn-ghost">Back</button>
            <button onClick={handleStartImport} className="btn btn-primary">Confirm & Import</button>
          </>
        );
      case 'IMPORTING':
        return null; // Don't allow closing/modifying during live import
      case 'COMPLETE':
        return (
          <>
            <button onClick={handleModalClose} className="btn btn-primary">Done</button>
          </>
        );
    }
  };

  const fieldsConfig: { key: RosterField; label: string; desc: string; required?: boolean }[] = [
    { key: 'name', label: 'Name', desc: 'Full name of the singer', required: true },
    { key: 'email', label: 'Email', desc: 'Enables user login if provided' },
    { key: 'phone', label: 'Phone', desc: 'Contact phone number' },
    { key: 'voicePart', label: 'Voice Part', desc: 'S1, A2, etc. (should match your configured parts)' },
    { key: 'globalStatus', label: 'Global Status', desc: 'Active, Idle, or Inactive' },
    { key: 'notes', label: 'Notes', desc: 'Administrative notes' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'IMPORTING' ? () => undefined : handleModalClose}
      title={
        step === 'UPLOAD' ? 'Import Singers via CSV' :
        step === 'MAP' ? 'Map CSV Columns' :
        step === 'PREVIEW' ? 'Preview & Validation' :
        step === 'IMPORTING' ? 'Importing Roster...' :
        'Import Completed'
      }
      footer={renderFooter()}
      maxWidth={step === 'PREVIEW' || step === 'COMPLETE' ? '800px' : '520px'}
    >
      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="flex-col gap-4 py-5 text-center">
          <p className="text-muted m-0 text-sm">
            Upload a CSV file containing your singer roster to bootstrap the process.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-[rgb(74_124_89_/_2%)] p-[40px_20px] transition-[border-color,background-color] duration-200"
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.02)';
            }}
          >
            <span className="text-5xl">📄</span>
            <div>
              <strong className="block text-base text-primary-deep">
                Select a CSV file to upload
              </strong>
              <span className="text-muted mt-1 block text-xs">
                or drag & drop it here
              </span>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex-col gap-4">
          <p className="text-muted m-0 text-sm">
            Align the columns in your CSV with our system database fields. Smart auto-matches have been pre-selected.
          </p>

          <div className="max-h-[350px] flex-col gap-2 overflow-y-auto pr-1">
            {fieldsConfig.map(field => {
              const selectedIndex = mapping[field.key];
              
              return (
                <div 
                  key={field.key} 
                  className="rounded-xl flex flex-row items-center justify-between gap-3 p-3 px-4 border border-border bg-surface" 
                  style={{ /* @allow-inline-style */ 
                    // @allow-inline-style - conditional field validation border
                    borderColor: field.required && selectedIndex === -1 ? 'var(--red-light)' : undefined,
                  }}
                >
                  <div className="flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-[6px]">
                      <strong className="text-sm text-text">{field.label}</strong>
                      {field.required && (
                        <span 
                          className="rounded bg-[rgb(153_27_27_/_10%)] px-[6px] py-[1px] text-[0.7rem] font-semibold text-danger-text"
                        >
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-xs">{field.desc}</span>
                  </div>

                  <select
                    value={selectedIndex}
                    onChange={(e) => handleMappingChange(field.key, parseInt(e.target.value))}
                    className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-[38px] w-[200px] px-[10px] text-sm shadow-none"
                    style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - conditional match border
                      borderColor: selectedIndex !== -1 ? 'var(--primary)' : undefined,
                    }}
                  >
                    <option value={-1}>-- Skip / Do Not Map --</option>
                    {csvData.headers.map((hdr, idx) => (
                      <option key={idx} value={idx}>
                        Column: "{hdr}"
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & VALIDATION */}
      {step === 'PREVIEW' && (
        <div className="flex-col gap-4">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-muted m-0 text-sm">
              Verify parsed singer details and resolve validation warnings or errors before importing.
            </p>
            <div className="flex gap-3">
              <span className="rounded-md border border-primary/20 bg-[rgb(74_124_89_/_5%)] px-2 py-1 text-xs font-semibold text-primary-deep">
                Total Mapped: {mappedSingers.length}
              </span>
              <span className="rounded-md border border-danger-text/20 bg-[rgb(153_27_27_/_5%)] px-2 py-1 text-xs font-semibold text-danger-text">
                Errors: {mappedSingers.filter(s => !s.isValid).length}
              </span>
            </div>
          </div>

          <div className="max-h-[350px] overflow-x-auto rounded-lg border border-border">
            <table className="m-0 table w-full min-w-[600px]">
              <thead className="sticky top-0 z-[1] bg-bg shadow-[0_1px_0_var(--border)]">
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
                      style={{ /* @allow-inline-style */ 
                        // @allow-inline-style - error/warning status background
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >
                      <td className="text-center text-xs text-text-muted">
                        {singer.rowNumber}
                      </td>
                      <td>
                        <strong className={hasErrors ? 'text-[#c62828]' : ''}>
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
                        <span className="rounded border border-border bg-bg inline-block p-[2px_6px] text-xs">
                          {singer.data.globalStatus}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div className="flex flex-col gap-0.5 text-xs text-[#c62828]">
                            {singer.errors.map((e, i) => <span key={i}>❌ {e}</span>)}
                          </div>
                        )}
                        {hasWarnings && (
                          <div className="flex flex-col gap-0.5 text-xs text-[#b78103]">
                            {singer.warnings.map((w, i) => <span key={i}>⚠️ {w}</span>)}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span className="text-xs text-primary-deep">🟢 Ready</span>
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
        <div className="flex-col items-center gap-4 py-5">
          <span className="animate-spin text-5xl">⚙️</span>
          
          <div className="w-full flex-col items-center gap-[6px]">
            <strong className="text-lg text-text">
              Importing {mappedSingers.filter(s => s.isValid).length} Singers...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedSingers.length}
            </span>
          </div>

          <div className="mt-[10px] h-3 w-full overflow-hidden rounded-full bg-border">
            <div 
              className="h-full bg-primary transition-[width] duration-100 ease-out"
              style={{ /* @allow-inline-style */ 
                // @allow-inline-style - dynamic progress bar width
                width: `${importProgress}%`,
              }}
            />
          </div>

          <div className="flex gap-5 text-sm text-text-muted">
            <span>Successes: <strong className="text-primary-deep">{successCount}</strong></span>
            <span>Failures: <strong className={errorsList.length > 0 ? 'text-[#991b1b]' : ''}>{errorsList.length}</strong></span>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'COMPLETE' && (
        <div className="flex-col gap-6 py-[10px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-6xl">🎉</span>
            <h3 className="m-0 text-2xl text-primary-deep">Import Finished!</h3>
            <p className="text-muted m-0 text-sm">
              Successfully imported <strong>{successCount}</strong> singers into the roster.
            </p>
          </div>

          {/* Credentials Download Callout */}
          {credentialsList.length > 0 && (
            <div 
              className="flex flex-row items-center justify-between gap-4 rounded-xl border border-[rgb(74_124_89_/_20%)] bg-[rgb(74_124_89_/_6%)] p-4 px-5"
            >
              <div className="flex-1 flex-col gap-1">
                <strong className="text-sm text-primary-deep">
                  🔑 Generated temporary credentials
                </strong>
                <span className="text-muted text-xs leading-[1.4]">
                  Created {credentialsList.length} new login accounts. Download this CSV now to save their temporary login passwords.
                </span>
              </div>
              <button 
                onClick={handleDownloadCredentials} 
                className="btn btn-primary flex h-10 items-center gap-[6px] whitespace-nowrap"
              >
                📥 Download CSV
              </button>
            </div>
          )}

          {/* Error Details */}
          {errorsList.length > 0 && (
            <div className="flex-col gap-1">
              <strong className="text-sm text-danger-text">
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div className="max-h-[150px] overflow-y-auto rounded-lg border border-border bg-[#fafafa] p-[8px_12px] text-xs">
                {errorsList.map((err, i) => (
                  <div key={i} className="p-[4px_0] text-[#444]" 
                    style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - Dynamic border based on position in list
                      borderBottom: i < errorsList.length - 1 ? '1px solid var(--border)' : undefined 
                    }}>
                    Row {err.row} (<strong>{err.name}</strong>): <span className="text-danger-text">{err.error}</span>
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
