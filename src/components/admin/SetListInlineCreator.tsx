import React, { useState, useMemo, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
import { getLearningTrackContextLabel } from '../../lib/music/learningTrackLabels';
import {
  createSetListItemFromCustomInput,
  createSetListItemFromMusicPiece,
  filterMusicLibrarySuggestions,
} from '../../lib/setList/setListItems';
import { Button, Input } from '../ui';

interface SetListInlineCreatorProps {
  library: MusicPiece[];
  disabled?: boolean;
  onAddItem: (item: SetListItem) => void;
  onCreateNewPiece?: (title: string) => void;
}

export const SetListInlineCreator: React.FC<SetListInlineCreatorProps> = ({
  library,
  disabled = false,
  onAddItem,
  onCreateNewPiece,
}) => {
  const [type, setType] = useState<'song' | 'intermission'>('song');
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredLibrary = useMemo(() => {
    if (type === 'intermission') return [];
    return filterMusicLibrarySuggestions(library, query);
  }, [library, query, type]);

  useClickOutside(containerRef, () => setShowSuggestions(false), {
    enabled: showSuggestions,
  });

  const handleAddItem = (piece?: MusicPiece) => {
    try {
      if (piece) {
        onAddItem(createSetListItemFromMusicPiece(piece));
        setQuery('');
        setDuration('');
        setShowSuggestions(false);
      } else {
        if (!query.trim()) return;
        if (type === 'song' && onCreateNewPiece) {
          onCreateNewPiece(query.trim());
          setQuery('');
          setDuration('');
          setShowSuggestions(false);
        } else {
          onAddItem(
            createSetListItemFromCustomInput({
              title: query.trim(),
              type,
              duration: duration.trim() || undefined,
            })
          );
          setQuery('');
          setDuration('');
          setShowSuggestions(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="rounded-xl bg-slate-50/70 p-4">
        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[auto_minmax(260px,1fr)_140px_auto]">
          <div className="border-border bg-surface inline-flex h-[44px] rounded-lg border p-1">
            <button
              type="button"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border-none px-4 text-sm font-semibold transition-colors ${
                type === 'song'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-primary-deep hover:bg-primary-light/50 bg-transparent'
              }`}
              onClick={() => setType('song')}
              disabled={disabled}
            >
              🎼 Song
            </button>
            <button
              type="button"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border-none px-4 text-sm font-semibold transition-colors ${
                type === 'intermission'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-primary-deep hover:bg-primary-light/50 bg-transparent'
              }`}
              onClick={() => setType('intermission')}
              disabled={disabled}
            >
              ⏸️ Intermission
            </button>
          </div>

          <div className="relative">
            <Input
              type="text"
              placeholder={
                type === 'song'
                  ? 'Search music library or enter a title...'
                  : 'Intermission title...'
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={onKeyDown}
              disabled={disabled}
            />
            {showSuggestions && query.trim().length > 0 && (
              <div className="border-border bg-surface absolute inset-x-0 top-full z-[100] mt-1 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto rounded-md border p-1 shadow-md">
                {filteredLibrary.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItem(p)}
                    className="group hover:bg-primary-light focus:bg-primary-light flex w-full flex-col items-start gap-0.5 rounded px-3 py-1.5 text-left transition-colors focus:outline-none"
                  >
                    <span className="text-text group-hover:text-primary-deep group-focus:text-primary-deep text-sm font-semibold">
                      {getLearningTrackContextLabel(
                        p,
                        library.find((parent) => parent.id === p.parentId)?.title
                      )}
                    </span>
                    {p.composer && (
                      <span className="text-text-muted group-hover:text-primary-deep/80 group-focus:text-primary-deep/80 text-xs">
                        by {p.composer}
                      </span>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className={`text-primary hover:bg-primary-light hover:text-primary-deep focus:bg-primary-light focus:text-primary-deep flex w-full flex-row items-center gap-1 rounded px-3 py-2 text-left text-sm font-semibold transition-colors focus:outline-none ${filteredLibrary.length > 0 ? 'border-border border-t' : 'border-t-0'}`}
                >
                  <span>"{query.trim()}"</span>
                  <span className="text-text-muted text-xs font-normal">
                    ({type === 'song' ? 'create new' : 'create new intermission'})
                  </span>
                </button>
              </div>
            )}
          </div>

          <Input
            type="text"
            placeholder="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
          />

          <Button
            type="button"
            variant="primary"
            onClick={() => handleAddItem()}
            disabled={disabled || !query.trim()}
            className="h-[44px] whitespace-nowrap"
          >
            + Add
          </Button>
        </div>
      </div>
      {type === 'song' && (
        <p className="mt-0.5 pl-4 text-sm leading-relaxed text-slate-500">
          <span className="font-semibold">Tip:</span> Select an existing library item from the
          suggestions, or press Enter to add a new piece to the music library.
        </p>
      )}
    </div>
  );
};
