import { useState, useEffect, useCallback } from 'react';
import { Settings, ReadPosition, LibraryItem, loadSettings, saveSettings, loadPositions, savePositions } from '../utils/storage';
import { openCBZ, isArchiveFile, isPDFFile } from '../utils/archive';
import { openPDF } from '../utils/pdf';

export interface PageData {
  name: string;
  dataUrl: string;
}

export interface BookState {
  id: string;
  name: string;
  pages: PageData[];
  count: number;
}

export function useReader() {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [positions, setPositionsState] = useState<Record<string, ReadPosition>>(loadPositions);
  const [library, setLibraryState] = useState<LibraryItem[]>([]);
  const [book, setBook] = useState<BookState | null>(null);
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

  useEffect(() => {
    setManga(settings.mangaByDefault);
    setDblPage(settings.doublePageByDefault);
    setFit(settings.fit);
    setSidebarOpen(settings.showLibraryOnStart);
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

  const openFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0);

    try {
      let pages: PageData[];

      if (isArchiveFile(file)) {
        setLoadingProgress(10);
        pages = await openCBZ(file);
        setLoadingProgress(100);
      } else if (isPDFFile(file)) {
        pages = await openPDF(file, (p) => setLoadingProgress(p));
      } else {
        throw new Error('Formato não suportado. Use .cbz, .zip ou .pdf');
      }

      if (pages.length === 0) {
        throw new Error('Nenhuma página encontrada no arquivo.');
      }

      const bookId = `${file.name}_${file.size}`;
      const newBook: BookState = {
        id: bookId,
        name: file.name,
        pages,
        count: pages.length,
      };

      setBook(newBook);

      // Restore position
      const pos = positions[bookId];
      if (pos) {
        const restoredView = manga ? (pages.length - 1 - pos.page) : pos.page;
        setViewIndex(Math.max(0, Math.min(restoredView, pages.length - 1)));
      } else {
        setViewIndex(0);
      }

      // Add to library
      setLibraryState(prev => {
        const exists = prev.find(i => i.id === bookId);
        if (exists) return prev;
        const item: LibraryItem = {
          id: bookId,
          name: file.name,
          file,
          type: isPDFFile(file) ? 'pdf' : 'cbz',
          lastOpened: Date.now(),
        };
        const next = [item, ...prev.filter(i => i.id !== bookId)];
        return next;
      });

    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [positions, manga]);

  const closeBook = useCallback(() => {
    setBook(null);
    setViewIndex(0);
    setError(null);
  }, []);

  // Navigation helpers
  const phys = useCallback((v: number) => manga ? (book ? book.count - 1 - v : 0) : v, [manga, book]);
  const disp = useCallback((p: number) => manga ? (book ? book.count - 1 - p : 0) : p, [manga, book]);

  const goNext = useCallback(() => {
    if (!book) return;
    const step = dblPage ? 2 : 1;
    setViewIndex(prev => Math.min(prev + step, book.count - 1));
  }, [book, dblPage]);

  const goPrev = useCallback(() => {
    if (!book) return;
    const step = dblPage ? 2 : 1;
    setViewIndex(prev => Math.max(0, prev - step));
  }, [book, dblPage]);

  const goFirst = useCallback(() => {
    setViewIndex(0);
  }, []);

  const goLast = useCallback(() => {
    if (!book) return;
    setViewIndex(book.count - 1);
  }, [book]);

  // Save position on view change
  useEffect(() => {
    if (book) {
      const curPage = phys(viewIndex);
      updatePosition(book.id, curPage, book.count);
    }
  }, [viewIndex, book, phys, updatePosition]);

  // Toggle manga mode
  const toggleManga = useCallback(() => {
    setManga((prev: boolean) => {
      if (book) {
        // Adjust view index to maintain same physical page
        setViewIndex(disp(phys(viewIndex)));
      }
      return !prev;
    });
  }, [book, viewIndex, phys, disp]);

  const toggleDblPage = useCallback(() => {
    setDblPage((prev: boolean) => !prev);
  }, []);

  const cycleFit = useCallback(() => {
    setFit(prev => {
      if (prev === 'width') return 'height';
      if (prev === 'height') return 'page';
      return 'width';
    });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(4, prev * 1.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.25, prev / 1.25));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          manga ? goPrev() : goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          manga ? goNext() : goPrev();
          break;
        case 'Home': goFirst(); break;
        case 'End': goLast(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'm': case 'M': toggleManga(); break;
        case 'd': case 'D': toggleDblPage(); break;
        case 'w': case 'W': cycleFit(); break;
        case 'Tab':
          e.preventDefault();
          setSidebarOpen(prev => !prev);
          break;
        case 'Escape':
          if (fullscreen) {
            document.exitFullscreen();
            setFullscreen(false);
          }
          break;
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manga, goNext, goPrev, goFirst, goLast, toggleFullscreen, toggleManga, toggleDblPage, cycleFit, zoomIn, zoomOut, fullscreen]);

  return {
    settings,
    updateSettings,
    positions,
    library,
    setLibrary: setLibraryState,
    book,
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
    setLoadingProgress,
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
