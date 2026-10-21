import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, ReadPosition, LibraryItemMeta,
  loadSettings, saveSettings, loadPositions, savePositions,
  loadLibrary, saveLibrary,
} from '../utils/storage';
import { isPDFFile, isCBRFile } from '../utils/archive';
import { openBook, closeCurrentBook, BookSession } from '../utils/pageProvider';

export function useReader() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [positions, setPositionsState] = useState<Record<string, ReadPosition>>(loadPositions);
  // Biblioteca agora é PERSISTIDA (corrige a "biblioteca fantasma": antes
  // saveLibrary existia mas loadLibrary nunca era chamado).
  const [library, setLibraryState] = useState<LibraryItemMeta[]>(loadLibrary);
  const [session, setSession] = useState<BookSession | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [manga, setManga] = useState(false);
  const [dblPage, setDblPage] = useState(false);
  const [fit, setFit] = useState<'width' | 'height' | 'page'>('width');
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // espelha manga em ref para efeitos sem re-trigger
  const mangaRef = useRef(manga);
  useEffect(() => { mangaRef.current = manga; }, [manga]);

  useEffect(() => {
    setManga(settings.mangaByDefault);
    setDblPage(settings.doublePageByDefault);
    setFit(settings.fit);
    setSidebarOpen(settings.showLibraryOnStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const updatePosition = useCallback((bookId: string, page: number, total: number) => {
    setPositionsState(prev => {
      const next = { ...prev, [bookId]: { page, total, ts: Date.now() } };
      savePositions(next);
      return next;
    });
  }, []);

  const upsertLibrary = useCallback((item: LibraryItemMeta) => {
    setLibraryState(prev => {
      const next = [item, ...prev.filter(i => i.id !== item.id)].slice(0, 200);
      saveLibrary(next); // persiste de verdade agora
      return next;
    });
  }, []);

  const removeFromLibrary = useCallback((id: string) => {
    setLibraryState(prev => {
      const next = prev.filter(i => i.id !== id);
      saveLibrary(next);
      return next;
    });
  }, []);

  const openFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      // LAZY: openBook só lê metadados — nenhuma página é pré-renderizada.
      const s = await openBook(file, (p) => setLoadingProgress(p));
      setSession(s);
      setZoom(1);

      const bookId = s.meta.id;
      upsertLibrary({
        id: bookId,
        name: file.name,
        type: isPDFFile(file) ? 'pdf' : isCBRFile(file) ? 'cbr' : 'cbz',
        size: file.size,
        lastOpened: Date.now(),
      });

      // Restore position (com correção de modo mangá)
      const pos = positions[bookId];
      if (pos && pos.page >= 0 && pos.page < s.meta.count) {
        const restoredView = mangaRef.current ? (s.meta.count - 1 - pos.page) : pos.page;
        setViewIndex(Math.max(0, Math.min(restoredView, s.meta.count - 1)));
      } else {
        setViewIndex(0);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [positions, upsertLibrary]);

  const closeBook = useCallback(() => {
    closeCurrentBook();
    setSession(null);
    setViewIndex(0);
    setZoom(1);
    setError(null);
  }, []);

  // Navigation helpers (viewIndex = índice de visualização; phys = físico)
  const count = session?.meta.count ?? 0;
  const phys = useCallback((v: number) => (manga && count ? count - 1 - v : v), [manga, count]);
  const disp = useCallback((p: number) => (manga && count ? count - 1 - p : p), [manga, count]);

  const goNext = useCallback(() => {
    if (!count) return;
    const step = dblPage ? 2 : 1;
    setViewIndex(prev => Math.min(prev + step, count - 1));
  }, [count, dblPage]);

  const goPrev = useCallback(() => {
    if (!count) return;
    const step = dblPage ? 2 : 1;
    setViewIndex(prev => Math.max(0, prev - step));
  }, [count, dblPage]);

  const goFirst = useCallback(() => setViewIndex(0), []);
  const goLast = useCallback(() => {
    if (!count) return;
    setViewIndex(count - 1);
  }, [count]);

  // Salva posição ao mudar de página
  useEffect(() => {
    if (session) {
      updatePosition(session.meta.id, phys(viewIndex), session.meta.count);
      // Prefetch dos vizinhos fora da thread principal (worker + cache LRU)
      session.prefetchAround(phys(viewIndex), settings.prefetch);
    }
  }, [viewIndex, session, phys, updatePosition, settings.prefetch]);

  // Toggle mangá — CORRIGIDO: mantém a MESMA página física e sem
  // efeitos colaterais dentro do updater do setState (bug antigo).
  const toggleManga = useCallback(() => {
    const newManga = !manga;
    if (count > 0) {
      const curPhys = phys(viewIndex); // física ANTES do toggle
      setViewIndex(newManga ? count - 1 - curPhys : curPhys);
    }
    setManga(newManga);
  }, [manga, count, viewIndex, phys]);

  const toggleDblPage = useCallback(() => setDblPage(prev => !prev), []);

  const cycleFit = useCallback(() => {
    setFit(prev => (prev === 'width' ? 'height' : prev === 'height' ? 'page' : 'width'));
  }, []);

  const zoomIn = useCallback(() => setZoom(prev => Math.min(4, prev * 1.25)), []);
  const zoomOut = useCallback(() => setZoom(prev => Math.max(0.25, prev / 1.25)), []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  // Sincroniza estado real de fullscreen (inclui Esc nativo)
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts — desativados quando um diálogo/modal está aberto
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select')) return;
      const modalOpen = !!document.querySelector('[role="dialog"]');
      if (modalOpen && e.key !== 'Escape') return;

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); manga ? goPrev() : goNext(); break;
        case 'ArrowLeft': e.preventDefault(); manga ? goNext() : goPrev(); break;
        case 'Home': goFirst(); break;
        case 'End': goLast(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'm': case 'M': toggleManga(); break;
        case 'd': case 'D': toggleDblPage(); break;
        case 'w': case 'W': cycleFit(); break;
        case 'Tab': e.preventDefault(); setSidebarOpen(prev => !prev); break;
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manga, goNext, goPrev, goFirst, goLast, toggleFullscreen, toggleManga, toggleDblPage, cycleFit, zoomIn, zoomOut]);

  return {
    settings,
    updateSettings,
    positions,
    library,
    removeFromLibrary,
    session,
    viewIndex,
    setViewIndex,
    manga,
    dblPage,
    fit,
    zoom,
    setZoom,
    fullscreen,
    sidebarOpen,
    setSidebarOpen,
    aiPanelOpen,
    setAiPanelOpen,
    loading,
    loadingProgress,
    error,
    setError,
    openFile,
    closeBook,
    goNext,
    goPrev,
    goFirst,
    goLast,
    toggleManga,
    toggleDblPage,
    cycleFit,
    zoomIn,
    zoomOut,
    toggleFullscreen,
    phys,
    disp,
  };
}
