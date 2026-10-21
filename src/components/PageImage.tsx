import { useEffect, useRef, useState } from 'react';
import type { BookSession } from '../utils/pageProvider';

export type FitMode = 'width' | 'height' | 'page';

interface Props {
  session: BookSession;
  /** índice FÍSICO da página */
  pageIndex: number;
  fit: FitMode;
  zoom: number;
  dblPage: boolean;
}

/**
 * Página individual com carregamento LAZY via worker + cache LRU (Blob → Object URL).
 * Substitui o antigo array pré-renderizado de dataURLs (estouro de memória).
 * Zoom >1 habilita pan por scroll nativo no container.
 */
export function PageImage({ session, pageIndex, fit, zoom, dblPage }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let myUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    session
      .getPageUrl(pageIndex)
      .then((u) => {
        if (cancelled) {
          session.releaseUrl(u);
          return;
        }
        myUrl = u;
        setUrl(u);
        session.markLoaded(pageIndex);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (myUrl) session.releaseUrl(myUrl);
    };
  }, [session, pageIndex]);

  // Ao voltar ao zoom 1, reseta o pan
  useEffect(() => {
    const el = containerRef.current;
    if (el && zoom === 1) el.scrollTo({ left: 0, top: 0 });
  }, [zoom]);

  const imgStyle: React.CSSProperties = {
    maxWidth: fit === 'width' ? (dblPage ? undefined : '100%') : fit === 'page' ? '90%' : 'none',
    maxHeight: fit === 'height' ? '100%' : fit === 'page' ? '100%' : 'none',
    transform: `scale(${zoom})`,
    transformOrigin: 'top center',
    filter: 'drop-shadow(0 10px 30px var(--shadow))',
    transition: 'transform 0.15s ease-out',
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full max-h-full w-full overflow-auto scrollbar-thin flex items-center justify-center"
      style={{ overscrollBehavior: 'contain' }}
    >
      {url && (
        <img
          src={url}
          alt={`Página ${pageIndex + 1}`}
          className="block rounded-sm select-none"
          style={imgStyle}
          draggable={false}
        />
      )}
      {!url && !failed && (
        <div className="flex flex-col items-center gap-3 opacity-60">
          <div className="w-10 h-10 border-4 border-[var(--line)] border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-xs">Página {pageIndex + 1}…</span>
        </div>
      )}
      {failed && (
        <div className="text-center text-sm opacity-70 p-6">
          <div className="text-3xl mb-2">⚠</div>
          Falha ao carregar a página {pageIndex + 1}
        </div>
      )}
    </div>
  );
}
