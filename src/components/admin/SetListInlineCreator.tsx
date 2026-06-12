import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
import { createSetListItemFromCustomInput, createSetListItemFromMusicPiece, filterMusicLibrarySuggestions } from '../../lib/setList/setListItems';
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
  onCreateNewPiece
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          onAddItem(createSetListItemFromCustomInput({
            title: query.trim(),
            type,
            duration: duration.trim() || undefined
          }));
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
      <div className="flex flex-row items-center gap-4 rounded-md border border-dashed border-border bg-slate-50/50 p-3">
        <div className="flex flex-row gap-1 rounded-md border border-border bg-white p-[2px]">
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
            placeholder={type === 'song' ? "Search music library..." : "Intermission title..."}
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
            className="pointer-events-none absolute right-3 size-4 text-text-muted"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
 
          {showSuggestions && query.trim().length > 0 && (
            <div className="absolute inset-x-0 top-full z-[100] mt-1 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-white p-1 shadow-md">
              {filteredLibrary.map(p => (
                <Button
                  key={p.id}
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => handleAddItem(p)}
                  className="flex h-auto min-h-0 w-full flex-col items-start gap-0.5 rounded px-3 py-1.5 text-left"
                >
                  <span className="text-sm font-semibold">{p.title}</span>
                  {p.composer && <span className="text-xs text-text-muted">by {p.composer}</span>}
                </Button>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => handleAddItem()}
                className="flex h-auto min-h-0 w-full flex-row items-center gap-1 rounded px-3 py-2 text-left text-sm font-semibold text-primary"
                // @allow-inline-style - conditional border when library has results
                style={{ 
                  borderTop: filteredLibrary.length > 0 ? '1px solid var(--color-border)' : 'none'
                }}
              >
                <span>"{query.trim()}"</span>
                <span className="text-xs font-normal text-text-muted">
                  ({type === 'song' ? 'create new' : 'create new intermission'})
                </span>
              </Button>
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
        <span className="pl-4 text-xs text-text-muted">
          Tip: Select the "(create new)" option or press Enter to add a new piece to the music library.
        </span>
      )}
    </div>
  );
};
