import { resolveCatalogLookupUrl } from '../../../../lib/musicPieceUtils';

interface MusicLibraryCatalogCellProps {
  catalogId?: string;
  catalogLookupTemplate: string;
}

export function MusicLibraryCatalogCell({
  catalogId,
  catalogLookupTemplate,
}: MusicLibraryCatalogCellProps) {
  const catalogLookupUrl = catalogId
    ? resolveCatalogLookupUrl(catalogLookupTemplate, catalogId)
    : null;

  return (
    <td
      style={{
        padding: '6px 10px',
        border: '1px solid var(--border)',
        verticalAlign: 'middle',
        textAlign: 'center',
      }}
    >
      {catalogId && catalogLookupUrl ? (
        <a
          href={catalogLookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          title={`View Catalog ID: ${catalogId}`}
          style={{
            color: 'var(--primary, #1b4d3e)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-sm, 4px)',
            transition: 'background-color 0.2s',
          }}
          className="btn-ghost"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      ) : null}
    </td>
  );
}
