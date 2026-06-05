import { resolveCatalogLookupUrl } from '../../../../lib/musicPieceUtils';
import '../MusicLibrary.css';

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
    <td className="ml-table-cell ml-table-cell-center">
      {catalogId && catalogLookupUrl ? (
        <a
          href={catalogLookupUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          title={`View Catalog ID: ${catalogId}`}
          className="btn-ghost ml-catalog-link"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      ) : null}
    </td>
  );
}
