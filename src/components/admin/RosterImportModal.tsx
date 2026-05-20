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

    const singers = validateAndMapSingers(csvData, mapping);
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
            <button onClick={handleReset} className="btn btn-ghost" style={{ marginRight: 'auto' }}>Restart</button>
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
    { key: 'voicePart', label: 'Voice Part', desc: 'S1, S2, A1, A2, T1, T2, B1, or B2' },
    { key: 'globalStatus', label: 'Global Status', desc: 'Active (Current), Active (Future), or Inactive' },
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
        <div className="flex-col" style={{ gap: 'var(--space-md)', textAlign: 'center', padding: '20px 0' }}>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Upload a CSV file containing your singer roster to bootstrap the process.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 20px',
              cursor: 'pointer',
              backgroundColor: 'rgba(74, 124, 89, 0.02)',
              transition: 'border-color 0.2s, background-color 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.02)';
            }}
          >
            <span style={{ fontSize: '3rem' }}>📄</span>
            <div>
              <strong style={{ color: 'var(--primary-deep)', display: 'block', fontSize: '1rem' }}>
                Select a CSV file to upload
              </strong>
              <span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>
                or drag & drop it here
              </span>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Align the columns in your CSV with our system database fields. Smart auto-matches have been pre-selected.
          </p>

          <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {fieldsConfig.map(field => {
              const selectedIndex = mapping[field.key];
              
              return (
                <div 
                  key={field.key} 
                  className="card" 
                  style={{ 
                    padding: '12px 16px', 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderColor: field.required && selectedIndex === -1 ? 'var(--red-light)' : undefined,
                  }}
                >
                  <div className="flex-col" style={{ gap: '2px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{field.label}</strong>
                      {field.required && (
                        <span 
                          style={{ 
                            fontSize: '0.7rem', 
                            backgroundColor: 'rgba(153, 27, 27, 0.1)', 
                            color: '#991b1b', 
                            padding: '1px 6px', 
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
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
                    className="card"
                    style={{ 
                      width: '200px', 
                      height: '38px', 
                      padding: '0 10px', 
                      border: '1px solid var(--border)', 
                      fontSize: '0.85rem',
                      borderColor: selectedIndex !== -1 ? 'var(--primary)' : undefined,
                      boxShadow: 'none',
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
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Verify parsed singer details and resolve validation warnings or errors before importing.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba(74, 124, 89, 0.05)', color: 'var(--primary-deep)', fontWeight: 600 }}>
                Total Mapped: {mappedSingers.length}
              </span>
              <span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba(153, 27, 27, 0.05)', color: '#991b1b', fontWeight: 600 }}>
                Errors: {mappedSingers.filter(s => !s.isValid).length}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: '350px' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px', margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Row</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th style={{ width: '100px' }}>Voice Part</th>
                  <th style={{ width: '130px' }}>Status</th>
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
                      style={{ 
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {singer.rowNumber}
                      </td>
                      <td>
                        <strong style={{ color: hasErrors ? '#c62828' : 'inherit' }}>
                          {singer.data.name || '(Empty Name)'}
                        </strong>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{singer.data.email || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-xs" style={{ fontWeight: 600 }}>
                          {singer.data.voicePart || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs card" style={{ padding: '2px 6px', display: 'inline-block' }}>
                          {singer.data.globalStatus}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div style={{ color: '#c62828', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {singer.errors.map((e, i) => <span key={i}>❌ {e}</span>)}
                          </div>
                        )}
                        {hasWarnings && (
                          <div style={{ color: '#b78103', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {singer.warnings.map((w, i) => <span key={i}>⚠️ {w}</span>)}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span style={{ color: 'var(--primary-deep)', fontSize: '0.8rem' }}>🟢 Ready</span>
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
        <div className="flex-col" style={{ gap: 'var(--space-md)', padding: '20px 0', alignItems: 'center' }}>
          <span style={{ fontSize: '3rem', animation: 'spin 2s linear infinite' }}>⚙️</span>
          
          <div className="flex-col" style={{ gap: '6px', width: '100%', alignItems: 'center' }}>
            <strong style={{ fontSize: '1.1rem', color: 'var(--text)' }}>
              Importing {mappedSingers.filter(s => s.isValid).length} Singers...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedSingers.length}
            </span>
          </div>

          <div style={{ width: '100%', height: '12px', backgroundColor: 'var(--border)', borderRadius: '6px', overflow: 'hidden', marginTop: '10px' }}>
            <div 
              style={{ 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                width: `${importProgress}%`,
                transition: 'width 0.1s ease-out',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            <span>Successes: <strong style={{ color: 'var(--primary-deep)' }}>{successCount}</strong></span>
            <span>Failures: <strong style={{ color: errorsList.length > 0 ? '#991b1b' : 'inherit' }}>{errorsList.length}</strong></span>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'COMPLETE' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)', padding: '10px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem' }}>🎉</span>
            <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--primary-deep)' }}>Import Finished!</h3>
            <p className="text-muted text-sm" style={{ margin: 0 }}>
              Successfully imported <strong>{successCount}</strong> singers into the roster.
            </p>
          </div>

          {/* Credentials Download Callout */}
          {credentialsList.length > 0 && (
            <div 
              className="card"
              style={{
                backgroundColor: 'rgba(74, 124, 89, 0.06)',
                borderColor: 'rgba(74, 124, 89, 0.2)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div className="flex-col" style={{ gap: '4px', flex: 1 }}>
                <strong style={{ color: 'var(--primary-deep)', fontSize: '0.95rem' }}>
                  🔑 Generated temporary credentials
                </strong>
                <span className="text-muted text-xs" style={{ lineHeight: 1.4 }}>
                  Created {credentialsList.length} new login accounts. Download this CSV now to save their temporary login passwords.
                </span>
              </div>
              <button 
                onClick={handleDownloadCredentials} 
                className="btn btn-primary"
                style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                📥 Download CSV
              </button>
            </div>
          )}

          {/* Error Details */}
          {errorsList.length > 0 && (
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <strong style={{ fontSize: '0.9rem', color: '#991b1b' }}>
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div 
                style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  backgroundColor: '#fafafa',
                  fontSize: '0.8rem',
                }}
              >
                {errorsList.map((err, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: i < errorsList.length - 1 ? '1px solid var(--border)' : undefined, color: '#444' }}>
                    Row {err.row} (<strong>{err.name}</strong>): <span style={{ color: '#991b1b' }}>{err.error}</span>
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
