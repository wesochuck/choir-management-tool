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
      }}
    >
      {catalogId ? (
        catalogLookupUrl ? (
          <a
            href={catalogLookupUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            style={{
              color: 'var(--color-primary, #1b4d3e)',
              textDecoration: 'underline',
              fontWeight: 500,
            }}
          >
            {catalogId}
          </a>
        ) : (
          catalogId
        )
      ) : (
        '-'
      )}
    </td>
  );
}
