import { useState } from 'react';
import type { MusicPiece, MusicPieceInput } from '../../services/musicLibraryService';
import { musicLibraryService } from '../../services/musicLibraryService';
import { musicLibraryWorkflows } from '../../services/musicLibraryWorkflows';
import type { SetListItem } from '../../services/eventService';
import { createSetListItemFromMusicPiece } from '../../lib/setList/setListItems';
import type { DialogContextValue } from '../../contexts/DialogContext';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';

export interface UseSetListLibraryProps {
  dialog: DialogContextValue;
  queryClient: QueryClient;
  items: SetListItem[];
  updateItems: (newItems: SetListItem[]) => Promise<boolean>;
  library: MusicPiece[];
}

export interface UseSetListLibraryReturn {
  isLibraryModalOpen: boolean;
  libraryEditingPiece: MusicPiece | null;
  pendingSetListAdd: boolean;
  prefilledTitleForSetList: string | null;
  onCloseLibraryModal: () => void;
  handleOpenPieceEditor: (pieceId: string) => void;
  handleSaveLibraryPiece: (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => Promise<void>;
  handleDeleteLibraryPiece: () => Promise<void>;
  handleCreateNewPieceFromSetList: (title: string) => void;
}

export function useSetListLibrary({
  dialog,
  queryClient,
  items,
  updateItems,
  library,
}: UseSetListLibraryProps): UseSetListLibraryReturn {
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [libraryEditingPiece, setLibraryEditingPiece] = useState<MusicPiece | null>(null);
  const [pendingSetListAdd, setPendingSetListAdd] = useState(false);
  const [prefilledTitleForSetList, setPrefilledTitleForSetList] = useState<string | null>(null);

  const onCloseLibraryModal = () => {
    setIsLibraryModalOpen(false);
    setPendingSetListAdd(false);
    setPrefilledTitleForSetList(null);
  };

  const handleOpenPieceEditor = (pieceId: string) => {
    const selectedPiece = library.find((p) => p.id === pieceId);
    if (!selectedPiece) return;

    if (selectedPiece.parentId) {
      const parentPiece = library.find((p) => p.id === selectedPiece.parentId);
      if (parentPiece) {
        setLibraryEditingPiece(parentPiece);
        setIsLibraryModalOpen(true);
        return;
      }
    }

    setLibraryEditingPiece(selectedPiece);
    setIsLibraryModalOpen(true);
  };

  const handleSaveLibraryPiece = async (
    data: Partial<MusicPieceInput> & {
      tuttiFile?: File | null;
      movements?: { title: string; duration?: string }[];
    }
  ) => {
    try {
      let savedPiece: MusicPiece;
      if (libraryEditingPiece) {
        const updateData = { ...data };
        delete updateData.movements;
        savedPiece = await musicLibraryService.updatePiece(libraryEditingPiece.id, updateData);
      } else {
        const { tuttiFile, movements, ...rest } = data;
        const pieceData = { ...rest };

        if (tuttiFile || (movements && movements.length > 0)) {
          savedPiece = await musicLibraryWorkflows.createPieceWithMovementsAndTutti(pieceData, {
            tuttiFile,
            movements,
          });
        } else {
          savedPiece = await musicLibraryService.createPiece(pieceData);
        }
      }

      setIsLibraryModalOpen(false);
      const updatedLib = await musicLibraryService.getLibrary();
      queryClient.setQueryData(queryKeys.musicLibrary.list(), updatedLib);

      if (pendingSetListAdd) {
        const newItem = createSetListItemFromMusicPiece(savedPiece);
        await updateItems([...items, newItem]);
      }
      setPendingSetListAdd(false);
      setPrefilledTitleForSetList(null);
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Could not save the library piece.',
        variant: 'danger',
      });
    }
  };

  const handleDeleteLibraryPiece = async () => {
    if (!libraryEditingPiece) return;
    try {
      await musicLibraryService.deletePiece(libraryEditingPiece.id);
      setIsLibraryModalOpen(false);
      const updatedLib = await musicLibraryService.getLibrary();
      queryClient.setQueryData(queryKeys.musicLibrary.list(), updatedLib);
    } catch (err) {
      console.error(err);
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to delete the music piece.',
        variant: 'danger',
      });
    }
  };

  const handleCreateNewPieceFromSetList = (title: string) => {
    setLibraryEditingPiece(null);
    setPrefilledTitleForSetList(title);
    setPendingSetListAdd(true);
    setIsLibraryModalOpen(true);
  };

  return {
    isLibraryModalOpen,
    libraryEditingPiece,
    pendingSetListAdd,
    prefilledTitleForSetList,
    onCloseLibraryModal,
    handleOpenPieceEditor,
    handleSaveLibraryPiece,
    handleDeleteLibraryPiece,
    handleCreateNewPieceFromSetList,
  };
}
