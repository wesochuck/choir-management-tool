import React, { useState, useMemo, useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
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
      // Logic errors (like invalid duration) should be handled by the caller or UI
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
    <div ref={containerRef} className="relative flex flex-col gap-2">
      <div className="border-border flex flex-row items-center gap-4 rounded-md border border-dashed bg-slate-50/50 p-3">
        <div className="border-border flex flex-row gap-1 rounded-md border bg-white p-[2px]">
          <Button
            type="button"
            variant={type === 'song' ? 'primary' : 'outline'}
            size="small"
            className="!h-8"
            onClick={() => setType('song')}
            disabled={disabled}
          >
            🎼 Song
          </Button>
          <Button
            type="button"
            variant={type === 'intermission' ? 'primary' : 'outline'}
            size="small"
            className="!h-8"
            onClick={() => setType('intermission')}
            disabled={disabled}
          >
            ⏸️ Intermission
          </Button>
        </div>

        <div className="relative flex flex-1 items-center">
          <Input
            type="text"
            placeholder={type === 'song' ? 'Search music library...' : 'Intermission title...'}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="h-9 w-full pr-10"
          />
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-muted pointer-events-none absolute right-3 size-4"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>

          {showSuggestions && query.trim().length > 0 && (
            <div className="border-border absolute inset-x-0 top-full z-[100] mt-1 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto rounded-md border bg-white p-1 shadow-md">
              {filteredLibrary.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="group hover:bg-primary-light focus:bg-primary-light flex w-full flex-col items-start gap-0.5 rounded px-3 py-1.5 text-left transition-colors focus:outline-none"
                >
                  <span className="text-text group-hover:text-primary-deep group-focus:text-primary-deep text-sm font-semibold">
                    {p.title}
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

        <div className="w-[100px]">
          <Input
            type="text"
            placeholder="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="h-9 w-full"
          />
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => handleAddItem()}
          disabled={disabled || !query.trim()}
          className="!h-9 px-4 text-sm font-semibold"
        >
          + Add
        </Button>
      </div>
      {type === 'song' && (
        <span className="text-text-muted pl-4 text-xs">
          Tip: Select the "(create new)" option or press Enter to add a new piece to the music
          library.
        </span>
      )}
    </div>
  );
};
