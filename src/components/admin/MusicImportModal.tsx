import React, { useState, useRef } from 'react';
import { BaseModal } from '../common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService, type MusicPieceInput } from '../../services/musicLibraryService';
import { parseCSV, type CSVData } from '../../lib/rosterImportUtils';
import {
  suggestMusicFieldMapping,
  validateAndMapMusicPieces,
  type MappedMusicPiece,
  type MusicField,
  type MusicFieldMapping,
} from '../../lib/musicImportUtils';

interface MusicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

type ImportStep = 'UPLOAD' | 'MAP' | 'PREVIEW' | 'IMPORTING' | 'COMPLETE';

export const MusicImportModal: React.FC<MusicImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dialog = useDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<ImportStep>('UPLOAD');
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mapping, setMapping] = useState<MusicFieldMapping>({
    title: -1,
    composer: -1,
    copies: -1,
    catalogId: -1,
    duration: -1,
    notes: -1,
  });
  const [mappedPieces, setMappedPieces] = useState<MappedMusicPiece[]>([]);
  
  // Execution progress
  const [importProgress, setImportProgress] = useState(0);
  const [importingIndex, setImportingIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorsList, setErrorsList] = useState<{ row: number; title: string; error: string }[]>([]);

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
      const suggested = suggestMusicFieldMapping(parsed.headers);
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
  const handleMappingChange = (field: MusicField, index: number) => {
    setMapping(prev => ({ ...prev, [field]: index }));
  };

  const handleApplyMapping = () => {
    if (!csvData) return;

    // Verify Title is mapped as it is required
    if (mapping.title === -1) {
      dialog.showMessage({
        title: 'Mapping Required',
        message: 'You must map a column to the "Title" field as it is required to create a music piece.',
        variant: 'danger',
      });
      return;
    }

    const pieces = validateAndMapMusicPieces(csvData, mapping);
    setMappedPieces(pieces);
    setStep('PREVIEW');
  };

  // 3. Handlers for Preview Step
  const handleStartImport = async () => {
    if (!csvData) return;

    const validPieces = mappedPieces.filter(p => p.isValid);
    if (validPieces.length === 0) {
      await dialog.showMessage({
        title: 'No Valid Records',
        message: 'There are no valid records to import. Please check your field mapping or fix errors.',
        variant: 'danger',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Confirm Import',
      message: `Ready to import ${validPieces.length} music pieces? ${
        mappedPieces.length - validPieces.length > 0 
          ? `${mappedPieces.length - validPieces.length} invalid rows will be skipped.` 
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

    // Run import sequentially to show live progress and handle partial success robustly
    let successes = 0;
    const errors: typeof errorsList = [];

    for (let i = 0; i < mappedPieces.length; i++) {
      const piece = mappedPieces[i];
      if (!piece.isValid) continue;

      setImportingIndex(i + 1);
      
      try {
        const payload: Partial<MusicPieceInput> = {
          title: piece.data.title,
          composer: piece.data.composer || undefined,
          copies: piece.data.copies || undefined,
          catalogId: piece.data.catalogId || undefined,
          duration: piece.data.duration || undefined,
          notes: piece.data.notes || undefined,
        };

        await musicLibraryService.createPiece(payload);
        successes++;
        setSuccessCount(successes);
      } catch (err: unknown) {
        console.error(`Import failed for row ${piece.rowNumber}:`, err);
        errors.push({
          row: piece.rowNumber,
          title: piece.data.title || 'Unknown Title',
          error: err instanceof Error ? err.message : 'Unknown database error',
        });
        setErrorsList([...errors]);
      }

      setImportProgress(Math.round(((i + 1) / mappedPieces.length) * 100));
    }

    setStep('COMPLETE');
    dialog.showToast(`Music library import finished: ${successes} items added.`);
    await onSuccess();
  };

  // Helper for resetting modal states
  const handleReset = () => {
    setStep('UPLOAD');
    setCsvData(null);
    setMapping({
      title: -1,
      composer: -1,
      copies: -1,
      catalogId: -1,
      duration: -1,
      notes: -1,
    });
    setMappedPieces([]);
    setErrorsList([]);
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

  const fieldsConfig: { key: MusicField; label: string; desc: string; required?: boolean }[] = [
    { key: 'title', label: 'Title', desc: 'Title of the piece', required: true },
    { key: 'composer', label: 'Composer/Arranger', desc: 'Who composed or arranged the piece' },
    { key: 'copies', label: 'Copies count', desc: 'Number of copies in the library' },
    { key: 'catalogId', label: 'Catalog ID', desc: 'Library unique identifier' },
    { key: 'duration', label: 'Duration', desc: 'e.g. 3:30 or 15m' },
    { key: 'notes', label: 'Notes', desc: 'Additional details or performances info' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={step === 'IMPORTING' ? () => undefined : handleModalClose}
      title={
        step === 'UPLOAD' ? 'Import Music Pieces via CSV' :
        step === 'MAP' ? 'Map CSV Columns' :
        step === 'PREVIEW' ? 'Preview & Validation' :
        step === 'IMPORTING' ? 'Importing Music...' :
        'Import Completed'
      }
      footer={renderFooter()}
      maxWidth={step === 'PREVIEW' || step === 'COMPLETE' ? '800px' : '520px'}
    >
      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="flex-col" style={{ gap: 'var(--space-md)', textAlign: 'center', padding: '20px 0' }}>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Upload a CSV file containing your music repertoire to bootstrap the process.
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
            <span style={{ fontSize: '3rem' }}>🎼</span>
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
            Align the columns in your CSV with our music library database fields. Smart auto-matches have been pre-selected.
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
                    {csvData.headers.map((hdr: string, idx: number) => (
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
              Verify parsed music piece details and resolve validation warnings or errors before importing.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba(74, 124, 89, 0.05)', color: 'var(--primary-deep)', fontWeight: 600 }}>
                Total Mapped: {mappedPieces.length}
              </span>
              <span className="text-xs card" style={{ padding: '4px 8px', background: 'rgba(153, 27, 27, 0.05)', color: '#991b1b', fontWeight: 600 }}>
                Errors: {mappedPieces.filter(p => !p.isValid).length}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: '350px' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px', margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg)', zIndex: 1, boxShadow: '0 1px 0 var(--border)' }}>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Row</th>
                  <th>Title</th>
                  <th>Composer</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Copies</th>
                  <th style={{ width: '100px' }}>Catalog ID</th>
                  <th>Status / Errors</th>
                </tr>
              </thead>
              <tbody>
                {mappedPieces.map((piece, idx) => {
                  const hasErrors = !piece.isValid;
                  const hasWarnings = piece.warnings.length > 0;
                  
                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {piece.rowNumber}
                      </td>
                      <td>
                        <strong style={{ color: hasErrors ? '#c62828' : 'inherit' }}>
                          {piece.data.title || '(Empty Title)'}
                        </strong>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{piece.data.composer || '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-xs" style={{ fontWeight: 600 }}>
                          {piece.data.copies !== undefined ? piece.data.copies : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs card" style={{ padding: '2px 6px', display: 'inline-block' }}>
                          {piece.data.catalogId || '-'}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div style={{ color: '#c62828', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {piece.errors.map((e, i) => <span key={i}>❌ {e}</span>)}
                          </div>
                        )}
                        {hasWarnings && (
                          <div style={{ color: '#b78103', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {piece.warnings.map((w, i) => <span key={i}>⚠️ {w}</span>)}
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
              Importing {mappedPieces.filter(p => p.isValid).length} Pieces...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedPieces.length}
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
              Successfully imported <strong>{successCount}</strong> music pieces into your library.
            </p>
          </div>

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
                    Row {err.row} (<strong>{err.title}</strong>): <span style={{ color: '#991b1b' }}>{err.error}</span>
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
