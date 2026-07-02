import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../lib/queryKeys';
import { useDialog } from '../../../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece } from '../../../../services/musicLibraryService';
import {
  getVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef,
} from '../../../../services/settingsService';
import { extractAudioDuration } from '../../../../lib/audioUtils';

export interface UseMusicPieceTracksParams {
  piece: MusicPiece | null;
  isOpen: boolean;
  onRefresh?: () => Promise<void>;
  onMovementsChanged?: () => Promise<void> | void;
  onTrackDurationLoaded?: (voicePart: string, durationSeconds: number | null) => void;
  onTrackDeleted?: (voicePart: string) => void;
}

export function useMusicPieceTracks({
  piece,
  isOpen,
  onRefresh,
  onMovementsChanged,
  onTrackDurationLoaded,
  onTrackDeleted,
}: UseMusicPieceTracksParams) {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const [localPiece, setLocalPiece] = useState<MusicPiece | null>(piece);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [uploadingParts, setUploadingParts] = useState<Record<string, boolean>>({});
  const [manuallyAddedParts, setManuallyAddedParts] = useState<Record<string, string[]>>({});

  const voicePartsQuery = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
    enabled: isOpen,
  });

  useEffect(() => {
    setLocalPiece(piece);
    if (!piece) {
      setManuallyAddedParts({});
    }
  }, [piece, isOpen]);

  useEffect(() => {
    if (voicePartsQuery.data) {
      setVoiceParts(voicePartsQuery.data.voiceParts);
      setSections(voicePartsQuery.data.sections);
    }
  }, [voicePartsQuery.data]);

  const uploadTrackMutation = useMutation({
    mutationFn: async ({ voicePart, file }: { voicePart: string; file: File }) => {
      if (!localPiece) return null;

      const existingFilename = localPiece.audioTrackMapping?.[voicePart];
      let currentFiles = localPiece.audioFiles || [];
      const currentMapping = { ...(localPiece.audioTrackMapping || {}) };

      if (existingFilename) {
        currentFiles = currentFiles.filter((f) => f !== existingFilename);
        delete currentMapping[voicePart];
      }

      const formData = new FormData();
      currentFiles.forEach((f) => {
        formData.append('audioFiles', f);
      });
      formData.append('audioFiles', file);

      const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, formData);

      const oldFiles = localPiece.audioFiles || [];
      const newFiles = updatedPiece.audioFiles || [];
      const addedFilename = newFiles.find((f) => !oldFiles.includes(f));

      if (addedFilename) {
        currentMapping[voicePart] = addedFilename;
        const finalPiece = await musicLibraryService.updatePiece(localPiece.id, {
          audioTrackMapping: currentMapping,
        });
        return finalPiece;
      } else {
        throw new Error('Upload succeeded but no new filename returned.');
      }
    },
    onSuccess: async (finalPiece) => {
      if (finalPiece) {
        setLocalPiece(finalPiece);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all });
      if (onRefresh) {
        await onRefresh();
      }
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Upload Failed',
        message:
          'Failed to upload the audio track. Ensure the file is under 20MB and is a valid audio format.',
        variant: 'danger',
      });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async ({ voicePart, filename }: { voicePart: string; filename: string }) => {
      if (!localPiece) return null;

      const filesToKeep = (localPiece.audioFiles || []).filter((f) => f !== filename);
      const newMapping = { ...(localPiece.audioTrackMapping || {}) };
      delete newMapping[voicePart];

      const updatedPiece = await musicLibraryService.updatePiece(localPiece.id, {
        audioFiles: filesToKeep,
        audioTrackMapping: newMapping,
      });
      return updatedPiece;
    },
    onSuccess: async (updatedPiece) => {
      if (updatedPiece) {
        setLocalPiece(updatedPiece);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all });
      if (onRefresh) {
        await onRefresh();
      }
      dialog.showToast('Audio track deleted successfully.');
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the audio track.',
        variant: 'danger',
      });
    },
  });

  const uploadMovementTrackMutation = useMutation({
    mutationFn: async ({
      movement,
      voicePart,
      file,
    }: {
      movement: MusicPiece;
      voicePart: string;
      file: File;
    }) => {
      const existingFilename = movement.audioTrackMapping?.[voicePart];
      let currentFiles = movement.audioFiles || [];
      const currentMapping = { ...(movement.audioTrackMapping || {}) };

      if (existingFilename) {
        currentFiles = currentFiles.filter((f) => f !== existingFilename);
        delete currentMapping[voicePart];
      }

      const formData = new FormData();
      currentFiles.forEach((f) => {
        formData.append('audioFiles', f);
      });
      formData.append('audioFiles', file);

      const updatedPiece = await musicLibraryService.updatePiece(movement.id, formData);

      const oldFiles = movement.audioFiles || [];
      const newFiles = updatedPiece.audioFiles || [];
      const addedFilename = newFiles.find((f) => !oldFiles.includes(f));

      if (addedFilename) {
        currentMapping[voicePart] = addedFilename;
        await musicLibraryService.updatePiece(movement.id, {
          audioTrackMapping: currentMapping,
        });
      } else {
        throw new Error('Upload succeeded but no new filename returned.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all });
      onMovementsChanged?.();
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Upload Failed',
        message:
          'Failed to upload the audio track for this movement. Ensure the file is under 20MB and is a valid audio format.',
        variant: 'danger',
      });
    },
  });

  const deleteMovementTrackMutation = useMutation({
    mutationFn: async ({
      movement,
      voicePart,
      filename,
    }: {
      movement: MusicPiece;
      voicePart: string;
      filename: string;
    }) => {
      const filesToKeep = (movement.audioFiles || []).filter((f) => f !== filename);
      const newMapping = { ...(movement.audioTrackMapping || {}) };
      delete newMapping[voicePart];

      await musicLibraryService.updatePiece(movement.id, {
        audioFiles: filesToKeep,
        audioTrackMapping: newMapping,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.musicLibrary.all });
      onMovementsChanged?.();
      dialog.showToast('Movement audio track deleted successfully.');
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the movement audio track.',
        variant: 'danger',
      });
    },
  });

  const handleFileUpload = async (voicePart: string, file: File) => {
    setUploadingParts((prev) => ({ ...prev, [voicePart]: true }));
    extractAudioDuration(file)
      .then((d) => onTrackDurationLoaded?.(voicePart, d))
      .catch(() => onTrackDurationLoaded?.(voicePart, null));
    try {
      await uploadTrackMutation.mutateAsync({ voicePart, file });
    } finally {
      setUploadingParts((prev) => ({ ...prev, [voicePart]: false }));
    }
  };

  const handleFileDelete = async (voicePart: string) => {
    if (!localPiece) return;
    const filename = localPiece.audioTrackMapping?.[voicePart];
    if (!filename) return;

    const confirmed = await dialog.confirm({
      title: 'Delete Learning Track',
      message: `Are you sure you want to delete the track for ${voicePart === 'tutti' ? 'Tutti' : voicePart}?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    await deleteTrackMutation.mutateAsync({ voicePart, filename });
    onTrackDeleted?.(voicePart);
  };

  const handleMovementFileUpload = async (movement: MusicPiece, voicePart: string, file: File) => {
    const uploadKey = `${movement.id}_${voicePart}`;
    setUploadingParts((prev) => ({ ...prev, [uploadKey]: true }));
    try {
      await uploadMovementTrackMutation.mutateAsync({ movement, voicePart, file });
    } finally {
      setUploadingParts((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleMovementFileDelete = async (movement: MusicPiece, voicePart: string) => {
    const filename = movement.audioTrackMapping?.[voicePart];
    if (!filename) return;

    const confirmed = await dialog.confirm({
      title: 'Delete Learning Track',
      message: `Are you sure you want to delete the track for ${voicePart === 'tutti' ? 'Tutti' : voicePart} in this movement?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    await deleteMovementTrackMutation.mutateAsync({ movement, voicePart, filename });
  };

  const handleAddPart = (id: string, part: string) => {
    setManuallyAddedParts((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), part],
    }));
  };

  const reset = () => {
    setUploadingParts({});
    setManuallyAddedParts({});
  };

  return {
    localPiece,
    voiceParts,
    sections,
    uploadingParts,
    manuallyAddedParts,
    setManuallyAddedParts,
    handleFileUpload,
    handleFileDelete,
    handleMovementFileUpload,
    handleMovementFileDelete,
    handleAddPart,
    reset,
  };
}
