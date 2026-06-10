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
import '../../views/admin/music-library/MusicLibraryEditors.css';

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
    arranger: -1,
    copies: -1,
    catalogId: -1,
    duration: -1,
    notes: -1,
    purchaseDate: -1,
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

    // @allow-sequential-await - Import runs sequentially to show live progress and handle partial success robustly.
    for (let i = 0; i < mappedPieces.length; i++) {
      const piece = mappedPieces[i];
      if (!piece.isValid) continue;

      setImportingIndex(i + 1);
      
      try {
        const payload: Partial<MusicPieceInput> = {
          title: piece.data.title,
          composer: piece.data.composer || undefined,
          arranger: piece.data.arranger || undefined,
          purchaseDate: piece.data.purchaseDate || undefined,
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
      arranger: -1,
      copies: -1,
      catalogId: -1,
      duration: -1,
      notes: -1,
      purchaseDate: -1,
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
            <button onClick={handleReset} className="btn btn-ghost mle-import-modal-bulk-restart">Restart</button>
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
    { key: 'composer', label: 'Composer', desc: 'Who composed the piece (can also parse combined composer/arranger if arranger column skipped)' },
    { key: 'arranger', label: 'Arranger', desc: 'Who arranged the piece (if separate column)' },
    { key: 'copies', label: 'Copies count', desc: 'Number of copies in the library' },
    { key: 'catalogId', label: 'Catalog ID', desc: 'Library unique identifier' },
    { key: 'duration', label: 'Duration', desc: 'e.g. 3:30 or 15m' },
    { key: 'notes', label: 'Notes', desc: 'Additional details or performances info' },
    { key: 'purchaseDate', label: 'Purchase Date', desc: 'e.g. 2026-05, MM/YYYY, or May 2026' },
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
        <div className="flex-col mle-import-modal-upload-container">
          <p className="text-muted text-sm mle-import-modal-upload-p">
            Upload a CSV file containing your music repertoire to bootstrap the process.
          </p>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="mle-import-modal-dropzone"
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'rgba(74, 124, 89, 0.02)';
            }}
          >
            <span className="mle-import-modal-dropzone-icon">🎼</span>
            <div>
              <strong className="mle-import-modal-dropzone-label">
                Select a CSV file to upload
              </strong>
              <span className="text-muted text-xs mle-import-modal-dropzone-sublabel">
                or drag & drop it here
              </span>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="mle-hidden-input" 
            />
          </div>

          <div className="mle-import-modal-hint">
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex-col mle-import-modal-map-container">
          <p className="text-muted text-sm mle-import-modal-upload-p">
            Align the columns in your CSV with our music library database fields. Smart auto-matches have been pre-selected.
          </p>

          <div className="flex-col mle-import-modal-map-list">
            {fieldsConfig.map(field => {
              const selectedIndex = mapping[field.key];
              const isRequiredMissing = field.required && selectedIndex === -1;
              
              return (
                <div 
                  key={field.key} 
                  className={`card mle-import-modal-map-card ${isRequiredMissing ? 'required-missing' : ''}`}
                >
                  <div className="flex-col mle-import-modal-map-field-info">
                    <div className="mle-import-modal-map-field-label-container">
                      <strong className="mle-import-modal-map-field-label">{field.label}</strong>
                      {field.required && (
                        <span className="mle-import-modal-map-required-badge">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-xs">{field.desc}</span>
                  </div>

                  <select
                    value={selectedIndex}
                    onChange={(e) => handleMappingChange(field.key, parseInt(e.target.value))}
                    className={`card mle-import-modal-map-select ${selectedIndex !== -1 ? 'mapped' : ''}`}
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
        <div className="flex-col mle-import-modal-preview-container">
          <div className="mle-import-modal-preview-header">
            <p className="text-muted text-sm mle-import-modal-upload-p">
              Verify parsed music piece details and resolve validation warnings or errors before importing.
            </p>
            <div className="mle-import-modal-preview-stats">
              <span className="text-xs card mle-import-modal-preview-stat-mapped">
                Total Mapped: {mappedPieces.length}
              </span>
              <span className="text-xs card mle-import-modal-preview-stat-errors">
                Errors: {mappedPieces.filter(p => !p.isValid).length}
              </span>
            </div>
          </div>

          <div className="mle-import-modal-table-container">
            <table className="table mle-import-modal-table">
              <thead className="mle-import-modal-table-thead">
                <tr>
                  <th className="mle-import-modal-table-row-num">Row</th>
                  <th>Title</th>
                  <th>Composer</th>
                  <th>Arranger</th>
                  <th className="mle-import-modal-table-copies">Copies</th>
                  <th className="mle-import-modal-table-catalog-col">Catalog ID</th>
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
                      // @allow-inline-style - conditional error/warning background
                      style={{ 
                        backgroundColor: hasErrors ? 'rgba(239, 83, 80, 0.05)' : hasWarnings ? 'rgba(255, 202, 40, 0.04)' : undefined 
                      }}
                    >
                      <td className="mle-import-modal-table-row-num">
                        {piece.rowNumber}
                      </td>
                      <td>
                        <strong className={hasErrors ? 'mle-import-modal-text-error' : ''}>
                          {piece.data.title || '(Empty Title)'}
                        </strong>
                      </td>
                      <td className="mle-import-modal-table-data-small">{piece.data.composer || '-'}</td>
                      <td className="mle-import-modal-table-data-small">{piece.data.arranger || '-'}</td>
                      <td className="mle-import-modal-table-copies">
                        <span className="text-xs mle-import-modal-table-data-bold">
                          {piece.data.copies !== undefined ? piece.data.copies : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs card mle-import-modal-table-catalog-id">
                          {piece.data.catalogId || '-'}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div className="mle-import-modal-status-errors">
                            {piece.errors.map((e, i) => <span key={i}>❌ {e}</span>)}
                          </div>
                        )}
                        {hasWarnings && (
                          <div className="mle-import-modal-status-warnings">
                            {piece.warnings.map((w, i) => <span key={i}>⚠️ {w}</span>)}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span className="mle-import-modal-status-ready">Ready</span>
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
        <div className="flex-col mle-import-modal-importing-container">
          <span className="mle-import-modal-importing-icon">⚙️</span>
          
          <div className="mle-import-modal-importing-title-container">
            <strong className="mle-import-modal-importing-title">
              Importing {mappedPieces.filter(p => p.isValid).length} Pieces...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedPieces.length}
            </span>
          </div>

          <div className="mle-import-modal-importing-progress-bg">
            <div 
              className="mle-import-modal-importing-progress-fill"
              // @allow-inline-style - dynamic progress bar width
              style={{ 
                width: `${importProgress}%`,
              }}
            />
          </div>

          <div className="mle-import-modal-importing-stats">
            <span>Successes: <strong className="mle-import-modal-text-primary">{successCount}</strong></span>
            <span>Failures: <strong className={errorsList.length > 0 ? 'mle-import-modal-text-danger' : ''}>{errorsList.length}</strong></span>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT COMPLETE */}
      {step === 'COMPLETE' && (
        <div className="flex-col mle-import-modal-complete-container">
          <div className="mle-import-modal-complete-header">
            <span className="mle-import-modal-complete-header-icon">🎉</span>
            <h3 className="mle-import-modal-complete-title">Import Finished!</h3>
            <p className="text-muted text-sm mle-import-modal-upload-p">
              Successfully imported <strong>{successCount}</strong> music pieces into your library.
            </p>
          </div>

          {/* Error Details */}
          {errorsList.length > 0 && (
            <div className="flex-col mle-import-modal-complete-errors-container">
              <strong className="mle-import-modal-complete-errors-label">
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div className="mle-import-modal-complete-errors-list">
                {errorsList.map((err, i) => (
                  <div key={i} className="mle-import-modal-complete-error-item">
                    Row {err.row} (<strong>{err.title}</strong>): <span className="mle-import-modal-text-danger">{err.error}</span>
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
