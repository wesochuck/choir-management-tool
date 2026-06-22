import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../../lib/queryKeys';
import { useDialog } from '../../../../contexts/DialogContext';
import { musicLibraryService, type MusicPiece } from '../../../../services/musicLibraryService';
import { getNextMovementNumber } from '../../../../lib/musicLibraryUtils';

export interface UseMusicPieceMovementsParams {
  piece: MusicPiece | null;
  isOpen: boolean;
  composer: string;
  arranger: string;
  copies: string;
  catalogId: string;
  sectionBuckets: string[];
}

export function useMusicPieceMovements({
  piece,
  isOpen,
  composer,
  arranger,
  copies,
  catalogId,
  sectionBuckets,
}: UseMusicPieceMovementsParams) {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const [isMultiMovement, setIsMultiMovement] = useState(false);
  const [newMovementTitle, setNewMovementTitle] = useState('');
  const [newMovementDuration, setNewMovementDuration] = useState('');
  const [expandedMovementId, setExpandedMovementId] = useState<string | null>(null);

  // Staging and Tutti uploads for new pieces (piece === null)
  const [isMultiMovementInput, setIsMultiMovementInput] = useState(false);
  const [localMovementsList, setLocalMovementsList] = useState<
    { id: string; title: string; duration?: string }[]
  >([]);
  const [tuttiFile, setTuttiFile] = useState<File | null>(null);
  const [isTuttiDraggedOver, setIsTuttiDraggedOver] = useState(false);
  const [stagingMovTitle, setStagingMovTitle] = useState('');
  const [stagingMovDuration, setStagingMovDuration] = useState('');

  const movementsQuery = useQuery({
    queryKey: queryKeys.musicLibrary.movements(piece?.id || ''),
    queryFn: () => musicLibraryService.getMovements(piece!.id),
    enabled: !!piece?.id && isOpen,
  });

  const movements = useMemo(() => movementsQuery.data || [], [movementsQuery.data]);

  useEffect(() => {
    if (movementsQuery.data) {
      setIsMultiMovement(movementsQuery.data.length > 0);
    }
  }, [movementsQuery.data]);

  useEffect(() => {
    if (piece) {
      setNewMovementTitle(`Movement ${getNextMovementNumber(movements)}`);
    } else {
      setNewMovementTitle('');
    }
  }, [movements, piece]);

  useEffect(() => {
    if (!piece) {
      setStagingMovTitle(`Movement ${getNextMovementNumber(localMovementsList)}`);
    }
  }, [localMovementsList, piece]);

  useEffect(() => {
    setIsMultiMovement(false);
    setIsMultiMovementInput(false);
    setLocalMovementsList([]);
    setTuttiFile(null);
    setIsTuttiDraggedOver(false);
    setStagingMovTitle('');
    setStagingMovDuration('');
    setNewMovementTitle('');
    setNewMovementDuration('');
    setExpandedMovementId(null);
  }, [piece, isOpen]);

  const addMovementMutation = useMutation({
    mutationFn: (data: Parameters<typeof musicLibraryService.createPiece>[0]) =>
      musicLibraryService.createPiece(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.musicLibrary.movements(piece?.id || ''),
      });
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to add movement.',
        variant: 'danger',
      });
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: (mId: string) => musicLibraryService.deletePiece(mId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.musicLibrary.movements(piece?.id || ''),
      });
      dialog.showToast('Movement deleted successfully.');
    },
    onError: (err) => {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete movement.',
        variant: 'danger',
      });
    },
  });

  const handleAddStagingMovement = (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    const defaultTitle = `Movement ${getNextMovementNumber(localMovementsList)}`;
    const titleVal = stagingMovTitle.trim() || defaultTitle;

    setLocalMovementsList((prev) => [
      ...prev,
      {
        id: `staged_${Date.now()}_${Math.random()}`,
        title: titleVal,
        duration: stagingMovDuration.trim() || undefined,
      },
    ]);
    setStagingMovTitle('');
    setStagingMovDuration('');
  };

  const handleRemoveStagingMovement = (id: string) => {
    setLocalMovementsList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddMovement = async (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!piece) return;

    const defaultTitle = `Movement ${getNextMovementNumber(movements)}`;
    const finalTitle = newMovementTitle.trim() || defaultTitle;

    try {
      await addMovementMutation.mutateAsync({
        title: finalTitle,
        parentId: piece.id,
        duration: newMovementDuration.trim() || undefined,
        composer: composer || undefined,
        arranger: arranger || undefined,
        voicing: piece.voicing || undefined,
        copies: copies ? parseInt(copies, 10) : undefined,
        catalogId: catalogId || undefined,
        sectionBuckets: sectionBuckets,
      });

      setNewMovementTitle('');
      setNewMovementDuration('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMovement = async (mId: string, mTitle: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Movement',
      message: `Are you sure you want to delete the movement "${mTitle}"?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    await deleteMovementMutation.mutateAsync(mId);
  };

  const reset = () => {
    setIsMultiMovement(false);
    setIsMultiMovementInput(false);
    setLocalMovementsList([]);
    setTuttiFile(null);
    setIsTuttiDraggedOver(false);
    setStagingMovTitle('');
    setStagingMovDuration('');
    setNewMovementTitle('');
    setNewMovementDuration('');
    setExpandedMovementId(null);
  };

  return {
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
    handleAddMovement,
    handleDeleteMovement,
    reset,
    refetchMovements: async () => {
      await movementsQuery.refetch();
    },
  };
}
