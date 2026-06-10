import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { SectionDef, VoicePartDef } from '../../../services/settingsService';
import { getVisibleTrackKeys } from './learningTrackKeys';
import './MusicLibraryEditors.css';

export interface LearningTracksEditorProps {
    piece: MusicPiece;
    voiceParts: VoicePartDef[];
    sections: SectionDef[];
    uploadingParts: Record<string, boolean>;
    uploadingKeyPrefix: string;
    onUpload: (voicePart: string, file: File) => Promise<void>;
    onDelete: (voicePart: string) => Promise<void>;
    manuallyAddedParts: string[];
    onAddPart: (part: string) => void;
}

export const LearningTracksEditor: React.FC<LearningTracksEditorProps> = ({
    piece,
    voiceParts,
    sections,
    uploadingParts,
    uploadingKeyPrefix,
    onUpload,
    onDelete,
    manuallyAddedParts,
    onAddPart
}) => {
    const [draggedOverPart, setDraggedOverPart] = useState<string | null>(null);

    const visibleKeys = getVisibleTrackKeys(piece, sections, voiceParts, manuallyAddedParts);
    const addableParts = voiceParts.filter(vp => !visibleKeys.includes(vp.label));
    const isMovement = !!uploadingKeyPrefix;

    return (
        <div className="flex-col mle-tracks-editor-container">
            {visibleKeys.map(partLabel => {
                const filename = piece.audioTrackMapping?.[partLabel];
                const uploadKey = `${uploadingKeyPrefix}${partLabel}`;
                const isUploading = uploadingParts[uploadKey];
                const isDraggedOver = draggedOverPart === partLabel;

                const isTutti = partLabel === 'tutti';
                const section = sections.find(s => s.code === partLabel);
                const voicePart = voiceParts.find(vp => vp.label === partLabel);

                const displayName = isTutti 
                    ? (isMovement ? 'Tutti' : 'Tutti (Full)') 
                    : partLabel;
                const fullName = isTutti 
                    ? 'Full Mix' 
                    : section 
                        ? section.name 
                        : voicePart 
                            ? voicePart.fullName 
                            : '';

                return (
                    <div 
                        key={partLabel} 
                        className={`flex-row mle-tracks-editor-item ${isMovement ? 'mle-tracks-editor-item-movement' : 'mle-tracks-editor-item-normal'}`} 
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (draggedOverPart !== partLabel) {
                                setDraggedOverPart(partLabel);
                            }
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggedOverPart(null);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggedOverPart(null);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                                onUpload(partLabel, file);
                            }
                        }}
                        // @allow-inline-style - drag-over drop zone indicator
                        style={{
                            padding: isDraggedOver 
                                ? (isMovement ? '5px 9px' : '7px 11px') 
                                : undefined,
                            backgroundColor: isDraggedOver ? 'rgba(74, 124, 89, 0.08)' : undefined,
                            border: isDraggedOver ? '2px dashed var(--primary)' : undefined,
                            transform: isDraggedOver ? 'scale(1.01)' : 'scale(1)',
                            boxShadow: isDraggedOver 
                                ? (isMovement ? '0 2px 8px rgba(74, 124, 89, 0.12)' : '0 4px 12px rgba(74, 124, 89, 0.15)') 
                                : undefined,
                        }}
                    >
                        <div className={`flex-col ${isMovement ? 'mle-tracks-editor-info-movement' : 'mle-tracks-editor-info-normal'}`}>
                            <strong className={`mle-tracks-editor-display-name ${isMovement ? 'mle-tracks-editor-display-name-movement' : 'mle-tracks-editor-display-name-normal'}`}>
                                {displayName}
                            </strong>
                            <span className={`text-xs text-muted ${isMovement ? 'mle-tracks-editor-full-name-movement' : 'mle-tracks-editor-full-name-normal'}`}>
                                {fullName}
                            </span>
                        </div>
                        
                        {isUploading ? (
                            <span className="text-xs text-muted animate-pulse mle-tracks-editor-uploading">Uploading...</span>
                        ) : filename ? (
                            <div className="mle-tracks-editor-audio-container">
                                <audio 
                                    src={pb.files.getURL(piece, filename)} 
                                    controls 
                                    className={`mle-tracks-editor-audio ${isMovement ? 'mle-tracks-editor-audio-movement' : 'mle-tracks-editor-audio-normal'}`}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm mle-tracks-editor-delete-btn" 
                                    onClick={() => onDelete(partLabel)}
                                    title="Delete track"
                                >
                                    🗑️
                                </button>
                            </div>
                        ) : (
                            <div className="mle-tracks-editor-empty-container">
                                <label 
                                    className="btn btn-secondary btn-sm mle-tracks-editor-upload-label" 
                                >
                                    📤 Upload
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                onUpload(partLabel, file);
                                            }
                                        }}
                                        className="mle-hidden-input"
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                );
            })}

            {addableParts.length > 0 && (
                <div className="flex-row animate-fade-in mle-tracks-editor-add-container">
                    <span className="mle-tracks-editor-add-label">
                        ➕ Add voice part track slot:
                    </span>
                    <select
                        value=""
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                                onAddPart(val);
                            }
                        }}
                        className="mle-tracks-editor-add-select"
                    >
                        <option value="" disabled>Select voice part...</option>
                        {addableParts.map(vp => (
                            <option key={vp.label} value={vp.label}>
                                {vp.label} ({vp.fullName})
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};
