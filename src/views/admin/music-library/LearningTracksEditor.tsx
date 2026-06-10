import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { SectionDef, VoicePartDef } from '../../../services/settingsService';
import { getVisibleTrackKeys } from './learningTrackKeys';

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
        <div className="flex flex-col gap-[var(--space-xs)] border border-[var(--border)] rounded-[var(--radius)] p-[var(--space-sm)] bg-[rgb(0_0_0_/_2%)]">
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
                        className={`flex-row items-center justify-between gap-[var(--space-md)] transition-all duration-150 ${isMovement ? 'p-[6px_10px] bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-[var(--radius)] scale-100 shadow-none text-[13px]' : 'p-[8px_12px] bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-[var(--radius)] scale-100 shadow-none'}`} 
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
                        <div className={`flex-col ${isMovement ? 'min-w-[80px]' : 'min-w-[90px]'}`}>
                            <strong className={`text-[var(--text-color)] ${isMovement ? 'text-[12px]' : 'text-[13px]'}`}>
                                {displayName}
                            </strong>
                            <span className={`text-xs text-muted ${isMovement ? 'text-[10px]' : 'text-[11px]'}`}>
                                {fullName}
                            </span>
                        </div>
                        
                        {isUploading ? (
                            <span className="text-xs text-muted animate-pulse text-[12px]">Uploading...</span>
                        ) : filename ? (
                            <div className="flex flex-row items-center gap-[var(--space-sm)] flex-1 justify-end">
                                <audio 
                                    src={pb.files.getURL(piece, filename)} 
                                    controls 
                                    className={`flex-1 w-full ${isMovement ? 'h-6' : 'h-7'}`}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm !text-[var(--danger)] !border-none !bg-none cursor-pointer !p-[4px_6px] min-h-auto !h-auto !m-0" 
                                    onClick={() => onDelete(partLabel)}
                                    title="Delete track"
                                >
                                    🗑️
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-row items-center justify-end flex-1">
                                <label 
                                    className="btn btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1 !text-[11px] !p-[2px_8px] !h-6 !min-h-6 !m-0" 
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
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                );
            })}

            {addableParts.length > 0 && (
                <div className="flex-row items-center gap-[var(--space-xs)] mt-[var(--space-xs)] pt-[var(--space-xs)] border-t border-dashed border-[var(--border)] justify-start animate-fade-in">
                    <span className="text-[11px] text-[var(--text-muted)] font-semibold">
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
                        className="text-[11px] p-[3px_8px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card-hover)] text-[var(--text-color)] cursor-pointer outline-none font-medium"
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
