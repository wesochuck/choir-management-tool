import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
import { createSetListItemFromCustomInput, createSetListItemFromMusicPiece, filterMusicLibrarySuggestions } from '../../lib/setList/setListItems';

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
    <div ref={containerRef} className="flex-col gap-[var(--space-xs)] relative">
      <div className="flex-row card p-[var(--space-sm)_var(--space-md)] gap-[var(--space-md)] items-center bg-[var(--bg-card-hover)] border border-dashed border-[var(--border)]">
        <div className="flex-row gap-1 bg-[var(--surface)] p-[2px] rounded-[var(--radius-sm)] border border-[var(--border)]">
          <button
            type="button"
            className={`btn btn-sm sl-type-btn ${type === 'song' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setType('song')}
            disabled={disabled}
          >
            🎼 Song
          </button>
          <button
            type="button"
            className={`btn btn-sm sl-type-btn ${type === 'intermission' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setType('intermission')}
            disabled={disabled}
          >
            ⏸️ Intermission
          </button>
        </div>

        <div className="flex-1 relative flex items-center">
          <input
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
            className="card w-full px-[36px_12px] h-9 border border-[var(--border)] text-[14px]"
          />
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="absolute right-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
 
          {showSuggestions && query.trim().length > 0 && (
            <div className="card shadow-md absolute top-full left-0 right-0 z-[100] mt-1 max-h-[300px] overflow-y-auto p-1 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)]">
              {filteredLibrary.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="btn btn-ghost w-full text-left flex flex-col items-start p-[8px_12px] rounded-[var(--radius-sm)] gap-[2px] min-h-auto"
                >
                  <span className="font-semibold text-[14px]">{p.title}</span>
                  {p.composer && <span className="text-[12px] opacity-70">by {p.composer}</span>}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="btn btn-ghost w-full text-left flex flex-row items-center p-[8px_12px] rounded-[var(--radius-sm)] gap-1 text-[var(--primary-deep)] font-semibold text-[14px] min-h-auto"
                // @allow-inline-style - conditional border when library has results
                style={{ 
                  borderTop: filteredLibrary.length > 0 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span>"{query.trim()}"</span>
                <span className="font-normal opacity-70 text-[13px]">
                  ({type === 'song' ? 'create new' : 'create new intermission'})
                </span>
              </button>
            </div>
          )}
        </div>
 
        <div className="w-[100px]">
          <input
            type="text"
            placeholder="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="card w-full px-3 h-9 border border-[var(--border)] text-[14px]"
          />
        </div>
 
        <button
          type="button"
          onClick={() => handleAddItem()}
          disabled={disabled || !query.trim()}
          className="btn btn-primary !h-9 min-h-auto px-4 text-[13px]"
        >
          + Add
        </button>
      </div>
      {type === 'song' && (
        <span className="text-xs text-muted pl-[var(--space-md)]">
          Tip: Select the "(create new)" option or press Enter to add a new piece to the music library.
        </span>
      )}
    </div>
  );
};
