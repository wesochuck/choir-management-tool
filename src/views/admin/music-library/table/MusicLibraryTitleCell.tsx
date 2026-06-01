import React from 'react';
import type { MusicPiece } from '../../../../types/musicLibrary';
import type { SectionDef, MusicGenreDef } from '../../../../services/settingsService';
import { formatPerformanceHistory } from '../../../../lib/musicPieceUtils';
import { TrackBadge, MultiMovementBadge, MovementBadge } from './MusicLibraryBadges';

interface MusicLibraryTitleCellProps {
  piece: MusicPiece;
  isChildMovement: boolean;
  isDuplicate: boolean;
  isParent: boolean;
  isExpanded: boolean;
  hasTracks: boolean;
  sections: SectionDef[];
  genres: MusicGenreDef[];
  onToggleExpansion: (event: React.MouseEvent) => void;
}

export function MusicLibraryTitleCell({
  piece,
  isChildMovement,
  isDuplicate,
  isParent,
  isExpanded,
  hasTracks,
  sections,
  genres,
  onToggleExpansion,
}: MusicLibraryTitleCellProps) {
  const isChild = isChildMovement;

  return (
    <td
      style={{
        padding: '6px 10px',
        paddingLeft: isChild ? '32px' : '10px',
        border: '1px solid var(--border)',
        verticalAlign: 'middle',
      }}
    >
      <div className="flex-col" style={{ gap: '2px' }}>
        <div className="flex-row" style={{ alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {isParent && (
            <button
              type="button"
              onClick={onToggleExpansion}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} movements for ${piece.title}`}
              title={`${isExpanded ? 'Collapse' : 'Expand'} movements`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                color: 'var(--text-muted, #64748b)',
                userSelect: 'none',
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {isChild && (
            <span
              className="text-xs text-muted"
              style={{ fontFamily: 'monospace', marginRight: '2px', userSelect: 'none' }}
            >
              └─
            </span>
          )}
          <strong style={{ color: isDuplicate ? '#e64a19' : 'inherit' }}>{piece.title}</strong>
          {hasTracks && <TrackBadge />}
          {isParent && <MultiMovementBadge />}
          {isChild && <MovementBadge />}
        </div>
        {piece.performances && piece.performances.length > 0 && (
          <span
            className="text-xs text-muted"
            title={formatPerformanceHistory(piece).join('\n')}
          >
            {piece.performances.length} historical performances
          </span>
        )}
        <div className="flex-row" style={{ gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
          {piece.genres?.map((id) => {
            const found = genres.find((g) => g.id === id);
            return (
              <span
                key={id}
                style={{
                  display: 'inline-flex',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(100, 116, 139, 0.06)',
                  border: '1px solid rgba(100, 116, 139, 0.15)',
                  fontSize: '9px',
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                }}
              >
                {found ? found.label : id}
              </span>
            );
          })}
        </div>
        <div className="flex-row" style={{ gap: 'var(--space-xs)', marginTop: '2px', flexWrap: 'wrap' }}>
          {!piece.sectionBuckets || piece.sectionBuckets.length === 0 ? (
            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6, fontSize: '10px' }}>
              All Sections
            </span>
          ) : (
            piece.sectionBuckets.map((code) => {
              const section = sections.find((s) => s.code === code);
              return (
                <span
                  key={code}
                  title={section ? section.name : code}
                  style={{
                    display: 'inline-flex',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-card-hover)',
                    border: '1px solid var(--border)',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                  }}
                >
                  {code}
                </span>
              );
            })
          )}
        </div>
      </div>
    </td>
  );
}
