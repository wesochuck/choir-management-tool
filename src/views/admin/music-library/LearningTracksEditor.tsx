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
        <div className="flex-col" style={{ 
            gap: 'var(--space-xs)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius)',
            padding: 'var(--space-sm)',
            backgroundColor: 'rgba(0, 0, 0, 0.02)'
        }}>
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
                        className="flex-row" 
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
                        style={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: isDraggedOver 
                                ? (isMovement ? '5px 9px' : '7px 11px') 
                                : (isMovement ? '6px 10px' : '8px 12px'),
                            backgroundColor: isDraggedOver ? 'rgba(74, 124, 89, 0.08)' : 'var(--bg-card-hover)',
                            border: isDraggedOver ? '2px dashed var(--primary)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            gap: 'var(--space-md)',
                            fontSize: isMovement ? '13px' : 'inherit',
                            transition: 'border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
                            transform: isDraggedOver ? 'scale(1.01)' : 'scale(1)',
                            boxShadow: isDraggedOver 
                                ? (isMovement ? '0 2px 8px rgba(74, 124, 89, 0.12)' : '0 4px 12px rgba(74, 124, 89, 0.15)') 
                                : 'none',
                        }}
                    >
                        <div className="flex-col" style={{ minWidth: isMovement ? '80px' : '90px' }}>
                            <strong style={{ fontSize: isMovement ? '12px' : '13px', color: 'var(--text-color)' }}>
                                {displayName}
                            </strong>
                            <span className="text-xs text-muted" style={{ fontSize: isMovement ? '10px' : '11px' }}>
                                {fullName}
                            </span>
                        </div>
                        
                        {isUploading ? (
                            <span className="text-xs text-muted animate-pulse" style={{ fontSize: '12px' }}>Uploading...</span>
                        ) : filename ? (
                            <div className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)', flex: 1, justifyContent: 'flex-end' }}>
                                <audio 
                                    src={pb.files.getURL(piece, filename)} 
                                    controls 
                                    style={{ 
                                        height: isMovement ? '24px' : '28px', 
                                        flex: 1,
                                        width: '100%'
                                    }} 
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm" 
                                    onClick={() => onDelete(partLabel)}
                                    style={{ 
                                        color: 'var(--danger)', 
                                        border: 'none', 
                                        background: 'none', 
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        minHeight: 'auto',
                                        height: 'auto',
                                        margin: 0
                                    }}
                                    title="Delete track"
                                >
                                    🗑️
                                </button>
                            </div>
                        ) : (
                            <div className="flex-row" style={{ alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                                <label 
                                    className="btn btn-secondary btn-sm" 
                                    style={{ 
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        height: '24px',
                                        minHeight: '24px',
                                        margin: 0
                                    }}
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
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                );
            })}

            {addableParts.length > 0 && (
                <div className="flex-row animate-fade-in" style={{
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginTop: 'var(--space-xs)',
                    paddingTop: 'var(--space-xs)',
                    borderTop: '1px dashed var(--border)',
                    justifyContent: 'flex-start'
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
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
                        style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-card-hover)',
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            outline: 'none',
                            fontWeight: 500
                        }}
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
