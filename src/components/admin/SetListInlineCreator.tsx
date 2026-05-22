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
    <div ref={containerRef} className="flex-col" style={{ gap: 'var(--space-xs)', position: 'relative' }}>
      <div className="flex-row card" style={{ 
        padding: 'var(--space-sm) var(--space-md)', 
        gap: 'var(--space-md)', 
        alignItems: 'center',
        backgroundColor: 'var(--bg-card-hover)',
        border: '1px dashed var(--border)'
      }}>
        <div className="flex-row" style={{ gap: '4px', backgroundColor: 'var(--surface)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${type === 'song' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '11px', padding: '2px 8px', minHeight: 'auto', height: '24px' }}
            onClick={() => setType('song')}
            disabled={disabled}
          >
            🎼 Song
          </button>
          <button
            type="button"
            className={`btn btn-sm ${type === 'intermission' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '11px', padding: '2px 8px', minHeight: 'auto', height: '24px' }}
            onClick={() => setType('intermission')}
            disabled={disabled}
          >
            ⏸️ Intermission
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            className="card"
            style={{ 
              width: '100%', 
              padding: '0 36px 0 12px', 
              height: '36px', 
              border: '1px solid var(--border)', 
              fontSize: '14px' 
            }}
          />
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ 
              position: 'absolute', 
              right: '12px', 
              width: '16px', 
              height: '16px', 
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
 
          {showSuggestions && query.trim().length > 0 && (
            <div className="card shadow-md" style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              right: 0, 
              zIndex: 100, 
              marginTop: '4px', 
              maxHeight: '300px', 
              overflowY: 'auto',
              padding: '4px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)'
            }}>
              {filteredLibrary.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="btn btn-ghost"
                  style={{ 
                    width: '100%', 
                    textAlign: 'left', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    gap: '2px',
                    minHeight: 'auto'
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.title}</span>
                  {p.composer && <span style={{ fontSize: '12px', opacity: 0.7 }}>by {p.composer}</span>}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="btn btn-ghost"
                style={{ 
                  width: '100%', 
                  textAlign: 'left', 
                  display: 'flex', 
                  flexDirection: 'row', 
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  gap: '4px',
                  color: 'var(--primary-deep)',
                  fontWeight: 600,
                  fontSize: '14px',
                  minHeight: 'auto',
                  borderTop: filteredLibrary.length > 0 ? '1px solid var(--border)' : 'none'
                }}
              >
                <span>"{query.trim()}"</span>
                <span style={{ fontWeight: 400, opacity: 0.7, fontSize: '13px' }}>
                  ({type === 'song' ? 'create new' : 'create new intermission'})
                </span>
              </button>
            </div>
          )}
        </div>
 
        <div style={{ width: '100px' }}>
          <input
            type="text"
            placeholder="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '36px', border: '1px solid var(--border)', fontSize: '14px' }}
          />
        </div>
 
        <button
          type="button"
          onClick={() => handleAddItem()}
          disabled={disabled || !query.trim()}
          className="btn btn-primary"
          style={{ height: '36px', minHeight: 'auto', padding: '0 16px', fontSize: '13px' }}
        >
          + Add
        </button>
      </div>
      {type === 'song' && (
        <span className="text-xs text-muted" style={{ paddingLeft: 'var(--space-md)' }}>
          Tip: Select the "(create new)" option or press Enter to add a new piece to the music library.
        </span>
      )}
    </div>
  );
};
