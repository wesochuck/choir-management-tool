import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { MusicPiece } from '../../types/musicLibrary';
import type { SetListItem } from '../../services/eventService';
import { createSetListItemFromCustomInput, createSetListItemFromMusicPiece, filterMusicLibrarySuggestions } from '../../lib/setList/setListItems';
import '../../views/admin/SetList.css';

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
    <div ref={containerRef} className="flex-col sl-creator-container">
      <div className="flex-row card sl-creator-card">
        <div className="flex-row sl-type-toggle-group">
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

        <div className="sl-search-container">
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
            className="card sl-search-input"
          />
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="sl-search-icon"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
 
          {showSuggestions && query.trim().length > 0 && (
            <div className="card shadow-md sl-suggestions-dropdown">
              {filteredLibrary.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="btn btn-ghost sl-suggestion-btn"
                >
                  <span className="sl-suggestion-title">{p.title}</span>
                  {p.composer && <span className="sl-suggestion-composer">by {p.composer}</span>}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="btn btn-ghost sl-suggestion-new-btn"
                // @allow-inline-style - conditional border when library has results
                style={{ 
                  borderTop: filteredLibrary.length > 0 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span>"{query.trim()}"</span>
                <span className="sl-suggestion-new-subtitle">
                  ({type === 'song' ? 'create new' : 'create new intermission'})
                </span>
              </button>
            </div>
          )}
        </div>
 
        <div className="sl-duration-container">
          <input
            type="text"
            placeholder="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="card sl-duration-input"
          />
        </div>
 
        <button
          type="button"
          onClick={() => handleAddItem()}
          disabled={disabled || !query.trim()}
          className="btn btn-primary sl-add-btn"
        >
          + Add
        </button>
      </div>
      {type === 'song' && (
        <span className="text-xs text-muted sl-creator-tip">
          Tip: Select the "(create new)" option or press Enter to add a new piece to the music library.
        </span>
      )}
    </div>
  );
};
