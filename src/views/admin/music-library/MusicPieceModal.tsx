import React from 'react';
import { Button, Modal, Select, Input, Textarea } from '../../../components/ui';
import { type MusicPiece, type MusicPieceInput } from '../../../services/musicLibraryService';
import { type MusicGenreDef } from '../../../services/settingsService';
import { MultiSelectDropdown } from './MultiSelectDropdown';

import {
  resolveCatalogLookupUrl,
  getLearningTrackContextLabel,
} from '../../../lib/musicPieceUtils';
import { LearningTracksEditor } from './LearningTracksEditor';
import { AutocompleteInput } from '../../../components/admin/AutocompleteInput';
import { useMusicPieceForm } from './useMusicPieceForm';
import { getNextMovementNumber } from '../../../lib/musicLibraryUtils';

export interface MusicPieceModalProps {
  isOpen: boolean;
  piece: MusicPiece | null;
  onClose: () => void;
  onSave: (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => Promise<void>;
  onSaveAndAddAnother?: (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => Promise<void>;
  onDelete?: () => Promise<void>;
  catalogLookupTemplate?: string;
  onRefresh?: () => Promise<void>;
  allPieces?: MusicPiece[];
  allGenres: MusicGenreDef[];
  initialTitle?: string;
  onCreateGenre?: (label: string) => Promise<MusicGenreDef>;
  initialTab?: 'details' | 'tracks' | 'performances' | 'movements';
  isSaving?: boolean;
}

export function MusicPieceModal({
  isOpen,
  piece,
  onClose,
  onSave,
  onSaveAndAddAnother,
  onDelete,
  catalogLookupTemplate,
  onRefresh,
  allPieces,
  allGenres,
  initialTitle,
  onCreateGenre,
  initialTab,
  isSaving = false,
}: MusicPieceModalProps) {
  const {
    refs: { titleInputRef },
    state: { activeTab, setActiveTab },
    details: {
      title,
      setTitle,
      composer,
      setComposer,
      arranger,
      setArranger,
      duration,
      setDuration,
      copies,
      setCopies,
      catalogId,
      setCatalogId,
      sectionBuckets,
      setSectionBuckets,
      selectedGenres,
      setSelectedGenres,
      notes,
      setNotes,
      purchaseDateInput,
      setPurchaseDateInput,
      uniqueComposers,
      uniqueArrangers,
      parentPiece,
      handleCreateGenreInline,
    },
    tracks: {
      localPiece,
      voiceParts,
      sections,
      uploadingParts,
      manuallyAddedParts,
      handleFileUpload,
      handleFileDelete,
      handleMovementFileUpload,
      handleMovementFileDelete,
      handleAddPart,
    },
    performances: {
      venues,
      selectedPerformances,
      availablePerformances,
      showQuickAdd,
      setShowQuickAdd,
      quickTitle,
      setQuickTitle,
      quickDate,
      setQuickDate,
      quickVenue,
      setQuickVenue,
      handleQuickAddPerformance,
      togglePerformance,
      quickAddPerformanceMutation,
    },
    movements: {
      movements,
      isMultiMovement,
      setIsMultiMovement,
      newMovementTitle,
      setNewMovementTitle,
      newMovementDuration,
      setNewMovementDuration,
      expandedMovementId,
      setExpandedMovementId,
      isMultiMovementInput,
      setIsMultiMovementInput,
      localMovementsList,
      stagingMovTitle,
      setStagingMovTitle,
      stagingMovDuration,
      setStagingMovDuration,
      tuttiFile,
      setTuttiFile,
      isTuttiDraggedOver,
      setIsTuttiDraggedOver,
      handleAddStagingMovement,
      handleRemoveStagingMovement,
      handleAddMovement: hookHandleAddMovement,
      handleDeleteMovement,
    },
    actions: { handleClose, handleSubmit, handleSaveAndAddAnother },
  } = useMusicPieceForm({
    isOpen,
    piece,
    onClose,
    onSave,
    onSaveAndAddAnother,
    onRefresh,
    allPieces,
    allGenres,
    initialTitle,
    onCreateGenre,
    initialTab,
  });

  const handleAddMovement = async (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    await hookHandleAddMovement(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={piece ? 'Edit Piece' : 'Add Piece'}
      maxWidth="640px"
      footer={
        onDelete ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:w-auto sm:flex-row">
              <Button
                variant="danger"
                className="w-full sm:w-auto"
                onClick={() => {
                  onClose();
                  onDelete();
                }}
              >
                Delete
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto"
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        ) : !piece && onSaveAndAddAnother ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <div className="flex flex-col-reverse gap-2 sm:mr-auto sm:w-auto sm:flex-row">
              <Button
                variant="secondary"
                disabled={isSaving}
                loading={isSaving}
                className="w-full sm:w-auto"
                onClick={handleSaveAndAddAnother}
              >
                Save & Add Another
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto"
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isSaving}
              loading={isSaving}
              className="w-full sm:w-auto"
              onClick={() => handleSubmit()}
            >
              Save Piece
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {piece && (
          <div className="border-border mb-4 flex flex-row gap-4 border-b">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'details' ? 'border-primary text-primary border-b-2 font-bold' : 'text-text-muted border-b-2 border-transparent font-medium'}`}
            >
              Piece Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'tracks' ? 'border-primary text-primary border-b-2 font-bold' : 'text-text-muted border-b-2 border-transparent font-medium'}`}
            >
              Learning Tracks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('performances')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'performances' ? 'border-primary text-primary border-b-2 font-bold' : 'text-text-muted border-b-2 border-transparent font-medium'}`}
            >
              Linked Performances
            </button>
            {isMultiMovement && (
              <button
                type="button"
                onClick={() => setActiveTab('movements')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${activeTab === 'movements' ? 'border-primary text-primary border-b-2 font-bold' : 'text-text-muted border-b-2 border-transparent font-medium'}`}
              >
                Movements ({movements.length})
              </button>
            )}
          </div>
        )}

        <form id="music-piece-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {(!piece || activeTab === 'details') && (
            <>
              {/* LINKED PARENT BANNER NOTICE */}
              {parentPiece && (
                <div className="border-primary bg-primary/5 text-text mb-2 flex items-center gap-2 rounded-md border-l-4 p-3 text-sm">
                  <span>
                    🔗 <strong>Multi-Movement Link:</strong> This piece is configured as a movement
                    of <strong>{parentPiece.title}</strong>.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-label">Title</label>
                <Input
                  ref={titleInputRef}
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Composer</label>
                  <AutocompleteInput
                    value={composer}
                    onChange={setComposer}
                    suggestions={uniqueComposers}
                    placeholder="e.g. Ludwig van Beethoven"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Arranger</label>
                  <AutocompleteInput
                    value={arranger}
                    onChange={setArranger}
                    suggestions={uniqueArrangers}
                    placeholder="e.g. Alice Parker"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Applies to Sections</label>
                  <MultiSelectDropdown
                    options={sections.map((s) => ({ id: s.code, label: s.name }))}
                    selectedIds={sectionBuckets}
                    onChange={setSectionBuckets}
                    placeholder="Sections"
                    allLabel="All Sections"
                  />
                  <span className="text-text-muted mt-1 text-xs">
                    {sectionBuckets.length === 0
                      ? 'Applies to all sections. Select to restrict.'
                      : `Restricted to: ${sectionBuckets.map((code) => sections.find((s) => s.code === code)?.name || code).join(', ')}`}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Genres</label>
                  <MultiSelectDropdown
                    options={[...allGenres]
                      .sort((a, b) => a.label.localeCompare(b.label))
                      .map((g) => ({ id: g.id, label: g.label }))}
                    selectedIds={selectedGenres}
                    onChange={setSelectedGenres}
                    placeholder="Genres"
                    allLabel="No Genre"
                    allowCreate={true}
                    onCreateOption={handleCreateGenreInline}
                    variant="chips"
                    searchable
                  />
                </div>
              </div>
              {piece ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-multi-movement"
                    checked={isMultiMovement}
                    onChange={(e) => setIsMultiMovement(e.target.checked)}
                    className="border-border text-primary focus:ring-primary size-4 cursor-pointer rounded-sm focus:ring-offset-0"
                  />
                  <span className="text-text cursor-pointer text-sm font-bold">
                    This is a multi-movement piece
                  </span>
                </label>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      id="is-multi-movement-input"
                      checked={isMultiMovementInput}
                      onChange={(e) => setIsMultiMovementInput(e.target.checked)}
                      className="border-border text-primary focus:ring-primary size-4 cursor-pointer rounded-sm focus:ring-offset-0"
                    />
                    <span className="text-text cursor-pointer text-sm font-bold">
                      This piece has multiple movements
                    </span>
                  </label>
                  {isMultiMovementInput && (
                    <div className="border-border mt-2 flex flex-col gap-2 rounded-lg border bg-gray-50/50 p-4">
                      <div className="flex flex-row items-center justify-between">
                        <span className="text-primary text-xs font-semibold">
                          Staged Movements ({localMovementsList.length})
                        </span>
                      </div>

                      {localMovementsList.length > 0 && (
                        <div className="flex max-h-[120px] flex-col gap-1 overflow-y-auto px-1">
                          {localMovementsList.map((m, idx) => (
                            <div
                              key={m.id}
                              className="border-border bg-surface flex items-center justify-between rounded-md border p-1.5 px-3 text-xs font-medium"
                            >
                              <span>
                                {idx + 1}. {m.title} {m.duration ? `(${m.duration})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveStagingMovement(m.id)}
                                className="text-danger-text cursor-pointer p-1 text-xs font-bold hover:text-red-700"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-1 flex flex-row items-center gap-2">
                        <Input
                          type="text"
                          placeholder={`Name (e.g. Movement ${getNextMovementNumber(localMovementsList)})`}
                          value={stagingMovTitle}
                          onChange={(e) => setStagingMovTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddStagingMovement(e);
                            }
                          }}
                          className="flex-[2]"
                        />
                        <Input
                          type="text"
                          placeholder="e.g. 2:45"
                          value={stagingMovDuration}
                          onChange={(e) => setStagingMovDuration(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddStagingMovement(e);
                            }
                          }}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          className="bg-primary enabled:hover:bg-primary-deep flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-xs font-bold text-white shadow-md transition-all enabled:active:scale-95 disabled:opacity-50"
                          onClick={() => handleAddStagingMovement()}
                        >
                          + Stage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Duration</label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3:30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Copies</label>
                  <Input type="number" value={copies} onChange={(e) => setCopies(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Catalog ID</label>
                  <Input value={catalogId} onChange={(e) => setCatalogId(e.target.value)} />
                  {catalogId.trim() &&
                    catalogLookupTemplate &&
                    resolveCatalogLookupUrl(catalogLookupTemplate, catalogId) && (
                      <a
                        href={resolveCatalogLookupUrl(catalogLookupTemplate, catalogId)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary-light text-primary-deep mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold no-underline transition-colors hover:bg-emerald-100 active:scale-95"
                      >
                        Lookup ↗
                      </a>
                    )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Purchase Date</label>
                  <Input
                    value={purchaseDateInput}
                    onChange={(e) => setPurchaseDateInput(e.target.value)}
                    placeholder="mm/yyyy"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. A cappella, performance instructions, etc."
                  className="min-h-[80px]"
                />
                <span className="text-text-muted mt-1 text-xs">
                  If this is a medley, please list the names of the different pieces here.
                </span>
              </div>

              {!piece && (
                <>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <label className="text-label">Link to Past Performance (Optional)</label>
                    <div className="flex min-h-[36px] flex-row flex-wrap gap-2 py-1">
                      {selectedPerformances.length === 0 ? (
                        <span className="text-text-muted text-sm font-medium">
                          No performances linked.
                        </span>
                      ) : (
                        selectedPerformances.map((perf) => {
                          const dateStr = perf.date
                            ? new Date(perf.date).toISOString().split('T')[0]
                            : '';
                          return (
                            <div
                              key={perf.id}
                              className="border-primary/30 bg-primary-light/50 text-primary-deep flex flex-row items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs"
                            >
                              <span>
                                {perf.title} {dateStr && `(${dateStr})`}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePerformance(perf.id)}
                                className="text-primary hover:text-primary-deep cursor-pointer text-sm leading-none font-bold"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <Select
                      size="small"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) togglePerformance(e.target.value);
                      }}
                    >
                      <option value="">-- Link a past performance --</option>
                      {availablePerformances.map((perf) => {
                        const dateStr = perf.date
                          ? new Date(perf.date).toISOString().split('T')[0]
                          : '';
                        return (
                          <option key={perf.id} value={perf.id}>
                            {perf.title} {dateStr && `(${dateStr})`}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <label className="text-label">Tutti Practice Track (Optional)</label>
                    {tuttiFile ? (
                      <div className="border-primary bg-primary/5 flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
                        <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
                          <span className="text-lg">🎵</span>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <strong className="text-text block truncate text-xs font-bold">
                              {tuttiFile.name}
                            </strong>
                            <span className="text-text-muted text-xs">
                              {(tuttiFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="border-border bg-surface text-danger-text hover:bg-danger-bg flex h-8 cursor-pointer items-center justify-center rounded-md border px-3 text-xs font-bold transition-colors active:scale-95"
                          onClick={() => setTuttiFile(null)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsTuttiDraggedOver(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsTuttiDraggedOver(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsTuttiDraggedOver(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('audio/')) {
                            setTuttiFile(file);
                          }
                        }}
                        className={`cursor-pointer rounded-lg p-4 transition-all duration-200 ease-in-out ${isTuttiDraggedOver ? 'border-primary bg-primary/5 border-2 border-dashed' : 'border-border border-2 border-dashed bg-transparent'}`}
                      >
                        <label className="m-0 flex w-full cursor-pointer items-center justify-center gap-2">
                          <span className="text-xl">📤</span>
                          <span className="text-text text-xs font-semibold">
                            Drag and drop a Tutti MP3 track here, or{' '}
                            <span className="text-primary font-bold underline">browse</span>
                          </span>
                          <Input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setTuttiFile(file);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {piece && activeTab === 'performances' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Linked Performances</label>

                {/* Selected performances pills */}
                <div className="flex min-h-[40px] flex-row flex-wrap gap-2 py-2">
                  {selectedPerformances.length === 0 ? (
                    <span className="text-text-muted text-sm font-medium">
                      No performances linked.
                    </span>
                  ) : (
                    selectedPerformances.map((perf) => {
                      const dateStr = perf.date
                        ? new Date(perf.date).toISOString().split('T')[0]
                        : '';
                      return (
                        <div
                          key={perf.id}
                          className="border-primary/30 bg-primary-light/50 text-primary-deep flex flex-row items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs"
                        >
                          <span>
                            {perf.title} {dateStr && `(${dateStr})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePerformance(perf.id)}
                            className="text-primary hover:text-primary-deep cursor-pointer text-sm leading-none font-bold"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-row flex-wrap items-center gap-3">
                  <Select
                    className="min-w-0 flex-[1_1_200px]"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        togglePerformance(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Add a performance --</option>
                    {availablePerformances.map((perf) => {
                      const dateStr = perf.date
                        ? new Date(perf.date).toISOString().split('T')[0]
                        : '';
                      return (
                        <option key={perf.id} value={perf.id}>
                          {perf.title} {dateStr && `(${dateStr})`}
                        </option>
                      );
                    })}
                  </Select>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-[1_1_auto]"
                    onClick={() => setShowQuickAdd(!showQuickAdd)}
                  >
                    {showQuickAdd ? 'Cancel Quick Add' : 'Quick Add Performance'}
                  </Button>
                </div>
              </div>

              {/* Quick Add Performance form */}
              {showQuickAdd && (
                <div className="border-primary/40 bg-primary/5 mt-4 flex flex-col gap-4 rounded-lg border border-dashed p-4">
                  <h4 className="text-primary-deep m-0 text-sm font-bold">
                    Quick Add Historic Performance
                  </h4>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label">Performance Title</label>
                      <Input
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="e.g. Spring Concert 2018"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-label">Date</label>
                        <Input
                          type="datetime-local"
                          value={quickDate}
                          onChange={(e) => setQuickDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-label">Venue</label>
                        <Select value={quickVenue} onChange={(e) => setQuickVenue(e.target.value)}>
                          <option value="">-- Select Venue --</option>
                          {venues.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      className="self-end"
                      onClick={handleQuickAddPerformance}
                      loading={quickAddPerformanceMutation.isPending}
                    >
                      Create & Link
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {piece && activeTab === 'tracks' && (
            <div
              className="flex flex-col gap-2"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {/* Context header: shows piece name + movement name */}
              {(() => {
                const parentPiece =
                  piece.parentId && allPieces
                    ? allPieces.find((p) => p.id === piece.parentId)
                    : undefined;
                const contextLabel = getLearningTrackContextLabel(piece, parentPiece?.title);
                return (
                  <div className="border-border mb-2 flex flex-col gap-1 border-b pb-3">
                    <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                      🎵 Learning Tracks for
                    </span>
                    <span className="text-primary text-base font-bold">{contextLabel}</span>
                  </div>
                );
              })()}
              {!localPiece ? (
                <div className="border-border text-text-muted flex flex-row items-center justify-center gap-2 rounded-lg border border-dashed bg-gray-50/50 p-4 text-sm">
                  <span>Please save this piece first to enable learning track uploads.</span>
                </div>
              ) : (
                <LearningTracksEditor
                  piece={localPiece}
                  voiceParts={voiceParts}
                  sections={sections}
                  uploadingParts={uploadingParts}
                  uploadingKeyPrefix=""
                  onUpload={handleFileUpload}
                  onDelete={handleFileDelete}
                  manuallyAddedParts={manuallyAddedParts[localPiece.id] || []}
                  onAddPart={(part) => handleAddPart(localPiece.id, part)}
                />
              )}
            </div>
          )}

          {piece && activeTab === 'movements' && isMultiMovement && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-row items-center justify-between">
                <h3 className="text-primary m-0 text-base font-bold">
                  Movements ({movements.length})
                </h3>
              </div>

              {movements.length === 0 ? (
                <div className="border-border text-text-muted flex flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50/50 py-12 text-sm">
                  No movements added yet. Add your first movement below.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {movements.map((m, idx) => {
                    const isExpanded = expandedMovementId === m.id;
                    const mMapping = m.audioTrackMapping || {};
                    const mTrackCount = Object.keys(mMapping).filter((k) => mMapping[k]).length;
                    return (
                      <div
                        key={m.id}
                        className="border-border rounded-lg border bg-gray-50/30 p-3 shadow-xs"
                      >
                        <div className="flex flex-row items-center justify-between gap-4">
                          <div className="flex flex-col">
                            <div className="flex flex-row items-center gap-2">
                              <strong className="text-text text-sm">
                                {idx + 1}. {m.title}
                              </strong>
                              {mTrackCount > 0 && (
                                <span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                                  🎧 {mTrackCount} Track{mTrackCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {m.duration && (
                              <span className="text-text-muted text-xs">
                                Duration: {m.duration}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-row items-center gap-2">
                            <button
                              type="button"
                              className="border-border bg-surface text-text-muted flex h-7 cursor-pointer items-center justify-center rounded-md border px-2.5 text-xs font-bold transition-colors hover:bg-gray-50 active:scale-95"
                              onClick={() => setExpandedMovementId(isExpanded ? null : m.id)}
                            >
                              {isExpanded ? 'Hide Tracks ▴' : 'Manage Tracks ▾'}
                            </button>
                            <button
                              type="button"
                              className="text-danger-text hover:bg-danger-bg flex h-7 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-bold transition-colors active:scale-95"
                              onClick={() => handleDeleteMovement(m.id, m.title)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-border mt-3 flex flex-col gap-2 border-t pt-3">
                            <strong className="text-text-muted block text-[11px] tracking-wider uppercase">
                              🎵 Reference & Learning Tracks for {m.title}
                            </strong>
                            <LearningTracksEditor
                              piece={m}
                              voiceParts={voiceParts}
                              sections={sections}
                              uploadingParts={uploadingParts}
                              uploadingKeyPrefix={`${m.id}_`}
                              onUpload={(part, file) => handleMovementFileUpload(m, part, file)}
                              onDelete={(part) => handleMovementFileDelete(m, part)}
                              manuallyAddedParts={manuallyAddedParts[m.id] || []}
                              onAddPart={(part) => handleAddPart(m.id, part)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-primary/40 bg-primary/5 rounded-lg border border-dashed p-4">
                <h4 className="text-primary-deep m-0 mb-3 text-sm font-bold">Add New Movement</h4>
                <div className="flex flex-row flex-wrap items-end gap-3">
                  <div className="flex flex-[2_1_200px] flex-col gap-1.5">
                    <label className="text-label">Movement Name (defaults sequentially)</label>
                    <Input
                      type="text"
                      placeholder={`e.g. Movement ${getNextMovementNumber(movements)}`}
                      value={newMovementTitle}
                      onChange={(e) => setNewMovementTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMovement(e);
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-[1_1_100px] flex-col gap-1.5">
                    <label className="text-label">Duration (optional)</label>
                    <Input
                      type="text"
                      placeholder="e.g. 2:45"
                      value={newMovementDuration}
                      onChange={(e) => setNewMovementDuration(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMovement(e);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="bg-primary enabled:hover:bg-primary-deep flex h-10 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-bold text-white shadow-md transition-all enabled:active:scale-95 disabled:opacity-50"
                    onClick={handleAddMovement}
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
