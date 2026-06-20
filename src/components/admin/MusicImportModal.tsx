import React, { useState, useRef } from 'react';
import { Modal, Button, Select, ProgressBar } from '../ui';
import { useDialog } from '../../contexts/DialogContext';
import { musicLibraryService } from '../../services/musicLibraryService';
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
    setMapping((prev) => ({ ...prev, [field]: index }));
  };

  const handleApplyMapping = () => {
    if (!csvData) return;

    // Verify Title is mapped as it is required
    if (mapping.title === -1) {
      dialog.showMessage({
        title: 'Mapping Required',
        message:
          'You must map a column to the "Title" field as it is required to create a music piece.',
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

    const validPieces = mappedPieces.filter((p) => p.isValid);
    if (validPieces.length === 0) {
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

    // Use chunked bulk imports to improve performance while still allowing partial failure tracking per chunk.
    let successes = 0;
    const errors: typeof errorsList = [];
    const BATCH_CHUNK_SIZE = 50;

    // @allow-sequential-await - Chunked loop is intentional to limit batch request rate and update UI.
    for (let i = 0; i < validPieces.length; i += BATCH_CHUNK_SIZE) {
      const chunkPieces = validPieces.slice(i, i + BATCH_CHUNK_SIZE);
      const payloads = chunkPieces.map((piece) => ({
        title: piece.data.title,
        composer: piece.data.composer || undefined,
        arranger: piece.data.arranger || undefined,
        purchaseDate: piece.data.purchaseDate || undefined,
        copies: piece.data.copies || undefined,
        catalogId: piece.data.catalogId || undefined,
        duration: piece.data.duration || undefined,
        notes: piece.data.notes || undefined,
      }));

      try {
        await musicLibraryService.bulkCreate(payloads);
        successes += payloads.length;
        setSuccessCount(successes);
      } catch (err: unknown) {
        console.error(`Bulk import failed for chunk starting at index ${i}:`, err);
        // If a batch fails, we record the error for the first piece in the chunk to notify the user.
        // The entire chunk fails because PocketBase batches are transactional.
        const firstFailedPiece = chunkPieces[0];
        errors.push({
          row: firstFailedPiece.rowNumber,
          title: `Batch starting with "${firstFailedPiece.data.title || 'Unknown'}"`,
          error: err instanceof Error ? err.message : 'Unknown database error during bulk creation',
        });
        setErrorsList([...errors]);
      }

      setImportingIndex(Math.min(i + BATCH_CHUNK_SIZE, validPieces.length));
      setImportProgress(
        Math.round((Math.min(i + BATCH_CHUNK_SIZE, validPieces.length) / validPieces.length) * 100)
      );
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
          <div className="flex w-full justify-end gap-2">
            <Button onClick={handleModalClose} variant="outline">
              Cancel
            </Button>
          </div>
        );
      case 'MAP':
        return (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <div className="flex justify-between gap-2 sm:mr-auto">
              <Button onClick={handleReset} variant="outline">
                Restart
              </Button>
              <Button onClick={() => setStep('UPLOAD')} variant="outline">
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
          <div className="flex w-full justify-end gap-2">
            <Button onClick={() => setStep('MAP')} variant="outline">
              Back
            </Button>
            <Button onClick={handleStartImport} variant="primary">
              Confirm & Import
            </Button>
          </div>
        );
      case 'IMPORTING':
        return null; // Don't allow closing/modifying during live import
      case 'COMPLETE':
        return (
          <div className="flex w-full justify-end gap-2">
            <Button onClick={handleModalClose} variant="primary">
              Done
            </Button>
          </div>
        );
    }
  };

  const fieldsConfig: { key: MusicField; label: string; desc: string; required?: boolean }[] = [
    { key: 'title', label: 'Title', desc: 'Title of the piece', required: true },
    {
      key: 'composer',
      label: 'Composer',
      desc: 'Who composed the piece (can also parse combined composer/arranger if arranger column skipped)',
    },
    { key: 'arranger', label: 'Arranger', desc: 'Who arranged the piece (if separate column)' },
    { key: 'copies', label: 'Copies count', desc: 'Number of copies in the library' },
    { key: 'catalogId', label: 'Catalog ID', desc: 'Library unique identifier' },
    { key: 'duration', label: 'Duration', desc: 'e.g. 3:30 or 15m' },
    { key: 'notes', label: 'Notes', desc: 'Additional details or performances info' },
    { key: 'purchaseDate', label: 'Purchase Date', desc: 'e.g. 2026-05, MM/YYYY, or May 2026' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'IMPORTING' ? () => undefined : handleModalClose}
      title={
        step === 'UPLOAD'
          ? 'Import Music Pieces via CSV'
          : step === 'MAP'
            ? 'Map CSV Columns'
            : step === 'PREVIEW'
              ? 'Preview & Validation'
              : step === 'IMPORTING'
                ? 'Importing Music...'
                : 'Import Completed'
      }
      footer={renderFooter()}
      maxWidth={step === 'PREVIEW' || step === 'COMPLETE' ? '800px' : '520px'}
    >
      {/* STEP 1: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="flex flex-col gap-4 py-5 text-center">
          <p className="text-muted !m-0 text-sm">
            Upload a CSV file containing your music repertoire to bootstrap the process.
          </p>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-border hover:border-primary flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-[rgb(74_124_89_/_2%)] px-5 py-10 hover:bg-[rgb(74_124_89_/_5%)]"
          >
            <span className="text-5xl">🎼</span>
            <div>
              <strong className="text-primary-deep block text-base font-bold">
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

          <div className="text-muted flex items-center justify-center gap-2 text-[0.8rem]">
            <span>💡</span>
            <span>The importer will automatically try to match column headers for you!</span>
          </div>
        </div>
      )}

      {/* STEP 2: FIELD MAPPING */}
      {step === 'MAP' && csvData && (
        <div className="flex flex-col gap-4">
          <p className="text-muted !m-0 text-sm">
            Align the columns in your CSV with our music library database fields. Smart auto-matches
            have been pre-selected.
          </p>

          <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto px-1">
            {fieldsConfig.map((field) => {
              const selectedIndex = mapping[field.key];
              const isRequiredMissing = field.required && selectedIndex === -1;

              return (
                <div
                  key={field.key}
                  className={`border-border bg-surface flex flex-row items-center justify-between gap-3 rounded-xl border !p-[12px_16px] ${isRequiredMissing ? 'border-[var(--red-light)]' : ''}`}
                >
                  <div className="flex flex-1 flex-col gap-[2px]">
                    <div className="flex items-center gap-[6px]">
                      <strong className="text-text text-[0.9rem]">{field.label}</strong>
                      {field.required && (
                        <span className="text-danger-text rounded bg-[rgb(153_27_27_/_10%)] px-[6px] py-[1px] text-[0.7rem] font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-muted text-xs">{field.desc}</span>
                  </div>

                  <Select
                    size="small"
                    value={selectedIndex}
                    onChange={(e) => handleMappingChange(field.key, parseInt(e.target.value))}
                    className={`!w-[200px] ${selectedIndex !== -1 ? '!border-primary' : ''}`}
                  >
                    <option value={-1}>-- Skip / Do Not Map --</option>
                    {csvData.headers.map((hdr: string, idx: number) => (
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
          <div className="flex items-center justify-between">
            <p className="text-muted !m-0 text-sm">
              Verify parsed music piece details and resolve validation warnings or errors before
              importing.
            </p>
            <div className="flex gap-3">
              <span className="border-primary/20 text-primary-deep rounded-md border bg-[rgb(74_124_89_/_5%)] !p-[4px_8px] text-xs font-semibold">
                Total Mapped: {mappedPieces.length}
              </span>
              <span className="border-danger-text/20 text-danger-text rounded-md border bg-[rgb(153_27_27_/_5%)] !p-[4px_8px] text-xs font-semibold">
                Errors: {mappedPieces.filter((p) => !p.isValid).length}
              </span>
            </div>
          </div>

          <div className="border-border max-h-[350px] overflow-x-auto rounded-md border">
            <table className="!m-0 table w-full min-w-[600px]">
              <thead className="bg-bg sticky top-0 z-[1] shadow-[0_1px_0_var(--color-border)]">
                <tr>
                  <th className="text-muted w-[60px] text-center text-[0.8rem]">Row</th>
                  <th>Title</th>
                  <th>Composer</th>
                  <th>Arranger</th>
                  <th className="w-20 text-center">Copies</th>
                  <th className="w-[100px]">Catalog ID</th>
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
                      className={hasErrors ? 'bg-red-50' : hasWarnings ? 'bg-amber-50' : ''}
                    >
                      <td className="text-muted w-[60px] text-center text-[0.8rem]">
                        {piece.rowNumber}
                      </td>
                      <td>
                        <strong className={hasErrors ? 'text-danger' : ''}>
                          {piece.data.title || '(Empty Title)'}
                        </strong>
                      </td>
                      <td className="text-[0.85rem]">{piece.data.composer || '-'}</td>
                      <td className="text-[0.85rem]">{piece.data.arranger || '-'}</td>
                      <td className="w-20 text-center">
                        <span className="text-xs font-semibold">
                          {piece.data.copies !== undefined ? piece.data.copies : '-'}
                        </span>
                      </td>
                      <td>
                        <span className="border-border bg-bg inline-block rounded border !p-[2px_6px] text-xs">
                          {piece.data.catalogId || '-'}
                        </span>
                      </td>
                      <td>
                        {hasErrors && (
                          <div className="text-danger flex flex-col gap-[2px] text-[0.8rem]">
                            {piece.errors.map((e, i) => (
                              <span key={i}>❌ {e}</span>
                            ))}
                          </div>
                        )}
                        {hasWarnings && (
                          <div className="text-warning-text flex flex-col gap-[2px] text-[0.8rem]">
                            {piece.warnings.map((w, i) => (
                              <span key={i}>⚠️ {w}</span>
                            ))}
                          </div>
                        )}
                        {!hasErrors && !hasWarnings && (
                          <span className="text-primary-deep text-[0.8rem]">Ready</span>
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
          <span className="animate-[spin_2s_linear_infinite] text-5xl">⚙️</span>

          <div className="flex w-full flex-col items-center gap-[6px]">
            <strong className="text-text text-[1.1rem]">
              Importing {mappedPieces.filter((p) => p.isValid).length} Pieces...
            </strong>
            <span className="text-muted text-sm">
              Processing row {importingIndex} of {mappedPieces.length}
            </span>
          </div>

          <ProgressBar
            value={importProgress}
            className="mt-[10px] h-3 w-full [&::part(base)]:rounded-md"
          />

          <div className="text-muted flex gap-5 text-[0.9rem]">
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
        <div className="flex flex-col gap-6 py-[10px_0]">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-[3.5rem]">🎉</span>
            <h3 className="text-primary-deep !m-0 text-[1.3rem]">Import Finished!</h3>
            <p className="text-muted !m-0 text-sm">
              Successfully imported <strong>{successCount}</strong> music pieces into your library.
            </p>
          </div>

          {errorsList.length > 0 && (
            <div className="flex flex-col gap-1">
              <strong className="text-danger-text text-[0.9rem]">
                ⚠️ Some rows failed to import ({errorsList.length})
              </strong>
              <div className="border-border bg-surface-muted max-h-[150px] overflow-y-auto rounded-md border p-[8px_12px] text-[0.8rem]">
                {errorsList.map((err, i) => (
                  <div
                    key={i}
                    className="border-border border-b py-1 text-gray-600 last:border-b-0"
                  >
                    Row {err.row} (<strong>{err.title}</strong>):{' '}
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
