import { useState, useEffect, useMemo } from 'react';
import type { MusicPiece } from '../../../../services/musicLibraryService';
import type { MusicGenreDef } from '../../../../services/settingsService';

export interface UseMusicPieceDetailsParams {
  piece: MusicPiece | null;
  allPieces?: MusicPiece[];
  allGenres: MusicGenreDef[];
  initialTitle?: string;
  onCreateGenre?: (label: string) => Promise<MusicGenreDef>;
}

export function useMusicPieceDetails({
  piece,
  allPieces,
  allGenres,
  initialTitle,
  onCreateGenre,
}: UseMusicPieceDetailsParams) {
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [arranger, setArranger] = useState('');
  const [duration, setDuration] = useState('');
  const [copies, setCopies] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [sectionBuckets, setSectionBuckets] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [purchaseDateInput, setPurchaseDateInput] = useState('');
  const [suggestedDuration, setSuggestedDuration] = useState<string | null>(null);

  const uniquePeople = useMemo(() => {
    const pool = new Set<string>();
    (allPieces || []).forEach((p) => {
      if (p.composer) pool.add(p.composer);
      if (p.arranger) pool.add(p.arranger);
    });
    return Array.from(pool).sort();
  }, [allPieces]);

  const uniqueComposers = uniquePeople;
  const uniqueArrangers = uniquePeople;

  const parentPiece = useMemo(() => {
    return piece?.parentId && allPieces
      ? allPieces.find((p) => p.id === piece.parentId)
      : undefined;
  }, [piece, allPieces]);

  useEffect(() => {
    if (piece) {
      setTitle(piece.title);
      setComposer(piece.composer || '');
      setArranger(piece.arranger || '');
      setDuration(piece.duration || '');
      setCopies(piece.copies?.toString() || '');
      setCatalogId(piece.catalogId || '');

      if (piece.purchaseDate) {
        const parts = piece.purchaseDate.split('-');
        if (parts.length >= 2) {
          setPurchaseDateInput(`${parts[1]}/${parts[0]}`);
        } else {
          setPurchaseDateInput('');
        }
      } else {
        setPurchaseDateInput('');
      }

      setSectionBuckets(piece.sectionBuckets || []);
      setSelectedGenres(piece.genres || []);
      setNotes(piece.notes || '');
      setSuggestedDuration(null);
    } else {
      setTitle(initialTitle || '');
      setComposer('');
      setArranger('');
      setDuration('');
      setCopies('');
      setCatalogId('');
      setPurchaseDateInput('');
      setSectionBuckets([]);
      setSelectedGenres([]);
      setNotes('');
      setSuggestedDuration(null);
    }
  }, [piece, initialTitle]);

  const isDirty = useMemo(() => {
    if (piece) {
      const titleChanged = title !== piece.title;
      const composerChanged = composer !== (piece.composer || '');
      const arrangerChanged = arranger !== (piece.arranger || '');
      const durationChanged = duration !== (piece.duration || '');
      const copiesChanged = copies !== (piece.copies?.toString() || '');
      const catalogIdChanged = catalogId !== (piece.catalogId || '');
      const notesChanged = notes !== (piece.notes || '');

      const originalPurchaseDisplay = piece.purchaseDate
        ? (() => {
            const p = piece.purchaseDate.split('-');
            return p.length >= 2 ? `${p[1]}/${p[0]}` : '';
          })()
        : '';
      const purchaseDateChanged = purchaseDateInput !== originalPurchaseDisplay;

      const initialSections = [...(piece.sectionBuckets || [])].sort();
      const currentSections = [...sectionBuckets].sort();
      const sectionsChanged = JSON.stringify(initialSections) !== JSON.stringify(currentSections);

      const initialGenres = [...(piece.genres || [])].sort();
      const currentGenres = [...selectedGenres].sort();
      const genresChanged = JSON.stringify(initialGenres) !== JSON.stringify(currentGenres);

      return (
        titleChanged ||
        composerChanged ||
        arrangerChanged ||
        durationChanged ||
        copiesChanged ||
        catalogIdChanged ||
        notesChanged ||
        sectionsChanged ||
        genresChanged ||
        purchaseDateChanged
      );
    } else {
      const hasTitle = title !== (initialTitle || '');
      const hasComposer = Boolean(composer.trim());
      const hasArranger = Boolean(arranger.trim());
      const hasDuration = Boolean(duration.trim());
      const hasCopies = Boolean(copies.trim());
      const hasCatalogId = Boolean(catalogId.trim());
      const hasNotes = Boolean(notes.trim());
      const hasSections = sectionBuckets.length > 0;
      const hasGenres = selectedGenres.length > 0;
      const hasPurchaseDate = Boolean(purchaseDateInput.trim());

      return (
        hasTitle ||
        hasComposer ||
        hasArranger ||
        hasDuration ||
        hasCopies ||
        hasCatalogId ||
        hasNotes ||
        hasSections ||
        hasGenres ||
        hasPurchaseDate
      );
    }
  }, [
    piece,
    title,
    composer,
    arranger,
    duration,
    copies,
    catalogId,
    notes,
    sectionBuckets,
    selectedGenres,
    initialTitle,
    purchaseDateInput,
  ]);

  const handleCreateGenreInline = async (label: string) => {
    if (!onCreateGenre) {
      throw new Error('Genre creation is not supported.');
    }
    const trimmed = label.trim();
    if (!trimmed) {
      throw new Error('Genre name cannot be empty.');
    }

    const existing = allGenres.find((g) => g.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selectedGenres.includes(existing.id)) {
        setSelectedGenres((prev) => [...prev, existing.id]);
      }
      return { id: existing.id, label: existing.label };
    }

    const newGenre = await onCreateGenre(trimmed);
    if (!selectedGenres.includes(newGenre.id)) {
      setSelectedGenres((prev) => [...prev, newGenre.id]);
    }
    return { id: newGenre.id, label: newGenre.label };
  };

  const reset = () => {
    setTitle('');
    setComposer('');
    setArranger('');
    setDuration('');
    setCopies('');
    setCatalogId('');
    setPurchaseDateInput('');
    setSectionBuckets([]);
    setSelectedGenres([]);
    setNotes('');
    setSuggestedDuration(null);
  };

  return {
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
    suggestedDuration,
    setSuggestedDuration,
    uniqueComposers,
    uniqueArrangers,
    parentPiece,
    handleCreateGenreInline,
    isDirty,
    reset,
  };
}
