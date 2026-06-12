import React, { useState } from 'react';
import { pb } from '../../../lib/pocketbase';
import type { MusicPiece } from '../../../types/musicLibrary';
import type { SectionDef, VoicePartDef } from '../../../services/settingsService';
import { getVisibleTrackKeys } from './learningTrackKeys';
import { Button } from '../../../components/ui';

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
        <div className="flex flex-col gap-1 rounded-md border border-border bg-[rgb(0_0_0_/_2%)] p-2">
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
                        className={`flex-row items-center justify-between gap-4 transition-all duration-150 ${isMovement ? 'scale-100 rounded-md border border-border bg-[var(--bg-card-hover)] p-[6px_10px] text-[13px] shadow-none' : 'scale-100 rounded-md border border-border bg-[var(--bg-card-hover)] p-[8px_12px] shadow-none'}`} 
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
                            border: isDraggedOver ? '2px dashed var(--color-primary)' : undefined,
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
                            <span className={`text-muted text-xs ${isMovement ? 'text-[10px]' : 'text-[11px]'}`}>
                                {fullName}
                            </span>
                        </div>
                        
                        {isUploading ? (
                            <span className="text-muted animate-pulse text-xs text-[12px]">Uploading...</span>
                        ) : filename ? (
                            <div className="flex flex-1 flex-row items-center justify-end gap-2">
                                <audio 
                                    src={pb.files.getURL(piece, filename)} 
                                    controls 
                                    className={`w-full flex-1 ${isMovement ? 'h-6' : 'h-7'}`}
                                />
                                <Button 
                                    type="button" 
                                    variant="outline"
                                    size="tiny"
                                    className="!m-0 !h-auto min-h-auto cursor-pointer !border-none !bg-none !p-[4px_6px] !text-[var(--danger)]" 
                                    onClick={() => onDelete(partLabel)}
                                    title="Delete track"
                                >
                                    🗑️
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-1 flex-row items-center justify-end">
                                <Button 
                                    as="label"
                                    variant="secondary"
                                    size="tiny"
                                    className="!m-0 cursor-pointer" 
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
                                </Button>
                            </div>
                        )}
                    </div>
                );
            })}

            {addableParts.length > 0 && (
                <div className="animate-fade-in mt-1 flex-row items-center justify-start gap-1 border-t border-dashed border-border pt-1">
                    <span className="text-[11px] font-semibold text-muted">
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
                        className="cursor-pointer rounded-md border border-border bg-[var(--bg-card-hover)] p-[3px_8px] text-[11px] font-medium text-[var(--text-color)] outline-none"
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
