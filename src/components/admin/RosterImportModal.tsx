import React, { useState, useRef } from 'react';
import { BaseModal } from '../common/BaseModal';
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
import './RosterUtils.css';

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
            <button onClick={handleReset} className="btn btn-ghost roster-ut-mr-auto">Restart</button>
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
    <BaseModal
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
        <div className="flex-col roster-ut-upload-container">
          <p className="text-muted text-sm roster-ut-margin-0">
            Upload a CSV file containing your singer roster to bootstrap the process.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="roster-ut-upload-dropzone"
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.02)';
            }}
          >
            <span className="roster-ut-upload-icon">📄</span>
            <div>
              <strong className="roster-ut-upload-title">
                Select a CSV file to upload
              </strong>
              <span className="text-muted text-xs roster-ut-upload-subtitle">
                or drag & drop it here
              </span>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="roster-ut-d-none" 
            />
          </div>

          <div className="roster-ut-upload-hint">
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex-col roster-ut-map-container">
          <p className="text-muted text-sm roster-ut-margin-0">
            Align the columns in your CSV with our system database fields. Smart auto-matches have been pre-selected.
          </p>

          <div className="flex-col roster-ut-map-list">
            {fieldsConfig.map(field => {
              const selectedIndex = mapping[field.key];
              
              return (
                <div 
                  key={field.key} 
                  className="card roster-ut-map-item" 
                  style={{ /* @allow-inline-style */ 
                    // @allow-inline-style - Dynamic border color for invalid required mapping
                    borderColor: field.required && selectedIndex === -1 ? 'var(--red-light)' : undefined,
                  }}
                >
                  <div className="flex-col roster-ut-map-item-info">
                    <div className="roster-ut-map-item-header">
                      <strong className="roster-ut-map-item-title">{field.label}</strong>
                      {field.required && (
                        <span 
                          className="roster-ut-map-item-required"
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
                    className="card roster-ut-map-select"
                    style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - Dynamic border color when actively mapped
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
        <div className="flex-col roster-ut-map-container">
          <div className="flex-responsive roster-ut-preview-header">
            <p className="text-muted text-sm roster-ut-margin-0">
              Verify parsed singer details and resolve validation warnings or errors before importing.
            </p>
            <div className="roster-ut-preview-stats">
              <span className="text-xs card roster-ut-preview-stat-mapped">
                Total Mapped: {mappedSingers.length}
              </span>
              <span className="text-xs card roster-ut-preview-stat-errors">
                Errors: {mappedSingers.filter(s => !s.isValid).length}
              </span>
            </div>
          </div>

          <div className="roster-ut-preview-table-container">
            <table className="table roster-ut-preview-table">
              <thead className="roster-ut-preview-thead">
                <tr>
                  <th className="roster-ut-preview-th-row">Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th className="roster-ut-preview-th-voicepart">Voice Part</th>
                  <th className="roster-ut-preview-th-status">Status</th>
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
                        // @allow-inline-style - Dynamic row color based on errors or warnings
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >
                      <td className="roster-ut-preview-td-row">
                        {singer.rowNumber}
                      </td>
                      <td>
                        <strong style={{ /* @allow-inline-style */ 
                          // @allow-inline-style - Dynamic name color based on error state
                          color: hasErrors ? '#c62828' : 'inherit' 
                        }}>
                          {singer.data.name || '(Empty Name)'}
                        </strong>
                      </td>
                      <td className="roster-ut-preview-td-email">{singer.data.email || '-'}</td>
                      <td className="roster-ut-preview-td-voicepart">
                        <span className="text-xs roster-ut-fw-600">
                          {singer.data.voicePart || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs card roster-ut-preview-status-badge">
                          {singer.data.globalStatus}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div className="roster-ut-preview-errors-list">
                            {singer.errors.map((e, i) => <span key={i}>❌ {e}</span>)}
                          </div>
                        )}
                        {hasWarnings && (
                          <div className="roster-ut-preview-warnings-list">
                            {singer.warnings.map((w, i) => <span key={i}>⚠️ {w}</span>)}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span className="roster-ut-preview-ready">🟢 Ready</span>
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
        <div className="flex-col roster-ut-importing-container">
          <span className="roster-ut-importing-icon">⚙️</span>
          
          <div className="flex-col roster-ut-importing-header">
            <strong className="roster-ut-importing-title">
              Importing {mappedSingers.filter(s => s.isValid).length} Singers...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedSingers.length}
            </span>
          </div>

          <div className="roster-ut-importing-progress-track">
            <div 
              className="roster-ut-importing-progress-bar"
              style={{ /* @allow-inline-style */ 
                // @allow-inline-style - Dynamic progress bar width
                width: `${importProgress}%`,
              }}
            />
          </div>

          <div className="roster-ut-importing-stats">
            <span>Successes: <strong className="roster-ut-importing-success">{successCount}</strong></span>
            <span>Failures: <strong style={{ /* @allow-inline-style */ 
                  // @allow-inline-style - Dynamic error count color
                  color: errorsList.length > 0 ? '#991b1b' : 'inherit' 
                }}>{errorsList.length}</strong></span>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'COMPLETE' && (
        <div className="flex-col roster-ut-complete-container">
          <div className="roster-ut-complete-header">
            <span className="roster-ut-complete-icon">🎉</span>
            <h3 className="roster-ut-complete-title">Import Finished!</h3>
            <p className="text-muted text-sm roster-ut-margin-0">
              Successfully imported <strong>{successCount}</strong> singers into the roster.
            </p>
          </div>

          {/* Credentials Download Callout */}
          {credentialsList.length > 0 && (
            <div 
              className="card roster-ut-complete-creds-callout"
            >
              <div className="flex-col roster-ut-complete-creds-info">
                <strong className="roster-ut-complete-creds-title">
                  🔑 Generated temporary credentials
                </strong>
                <span className="text-muted text-xs roster-ut-complete-creds-desc">
                  Created {credentialsList.length} new login accounts. Download this CSV now to save their temporary login passwords.
                </span>
              </div>
              <button 
                onClick={handleDownloadCredentials} 
                className="btn btn-primary roster-ut-complete-creds-btn"
              >
                📥 Download CSV
              </button>
            </div>
          )}

          {/* Error Details */}
          {errorsList.length > 0 && (
            <div className="flex-col roster-ut-complete-errors">
              <strong className="roster-ut-complete-errors-title">
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div className="roster-ut-complete-errors-list">
                {errorsList.map((err, i) => (
                  <div key={i} className="roster-ut-complete-error-item" 
                    style={{ /* @allow-inline-style */ 
                      // @allow-inline-style - Dynamic border based on position in list
                      borderBottom: i < errorsList.length - 1 ? '1px solid var(--border)' : undefined 
                    }}>
                    Row {err.row} (<strong>{err.name}</strong>): <span className="roster-ut-complete-error-text">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};
