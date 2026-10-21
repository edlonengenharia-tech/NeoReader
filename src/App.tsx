import { useState, useRef, useCallback, useEffect } from 'react';
import { useReader } from './hooks/useReader';
import { isSupportedFile } from './utils/archive';
import { PageImage } from './components/PageImage';
import { LibrarySidebar } from './components/LibrarySidebar';
import { OptionsDialog } from './components/OptionsDialog';
import { HelpDialog } from './components/HelpDialog';
import type { LibraryItemMeta } from './utils/storage';

const FIT_LABELS: Record<string, string> = { width: 'Largura', height: 'Altura', page: 'Página' };

function App() {
  const reader = useReader();
  const {
    settings, updateSettings, positions, library, removeFromLibrary,
    session, viewIndex, manga, dblPage, fit, zoom, setZoom,
    fullscreen, sidebarOpen, setSidebarOpen, aiPanelOpen, setAiPanelOpen,
    loading, loadingProgress, error, setError, openFile, closeBook,
    goNext, goPrev, goFirst, goLast,
    toggleManga, toggleDblPage, cycleFit, zoomIn, zoomOut, toggleFullscreen,
    phys,
  } = reader;

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Page transition key (animação de virada)
  useEffect(() => {
    if (settings.flipAnimation) setPageKey((k) => k + 1);
  }, [viewIndex, settings.flipAnimation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isSupportedFile(file)) openFile(file);
  }, [openFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openFile(file);
    if (e.target) e.target.value = '';
  }, [openFile]);

  // Reabrir item da biblioteca → File não é persistível; pede o arquivo de novo.
  const handleOpenRequest = useCallback((_item: LibraryItemMeta) => {
    setError(`Selecione "${_item.name}" novamente para reabrir.`);
    fileInputRef.current?.click();
  }, [setError]);

  // Wheel zoom — listener passivo com preventDefault só quando Ctrl (corrige warning)
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || !session) return;
      e.preventDefault();
      setZoom((z: number) => Math.min(4, Math.max(0.25, z * (e.deltaY < 0 ? 1.1 : 0.9))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [session, setZoom]);

  const count = session?.meta.count ?? 0;
  const currentPage = phys(viewIndex);
  const progress = count ? ((currentPage + 1) / count) * 100 : 0;

  // páginas visíveis (índices físicos)
  const displayPages: number[] = [];
  if (session) {
    for (let i = 0; i < (dblPage ? 2 : 1); i++) {
      const v = viewIndex + i;
      if (v >= count) break;
      displayPages.push(phys(v));
    }
  }

  return (
    <div className="nekko-bg h-screen w-screen flex flex-col overflow-hidden" data-theme={settings.theme}>

      {/* Title Bar */}
      {!fullscreen && (
        <header className="nekko-panel h-11 flex items-center gap-2 px-2 flex-none border-b border-[var(--line)]">
          <span className="font-bold text-sm mr-2 select-none">🐱 NekkoReader</span>
          <button onClick={() => fileInputRef.current?.click()} className="pill-btn">📂 Abrir</button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`pill-btn ${sidebarOpen ? 'ring-1 ring-[var(--accent)]/40' : ''}`}>📚 Biblioteca</button>
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className={`pill-btn ${aiPanelOpen ? 'ring-1 ring-[var(--accent)]/40' : ''}`} title="Assistente IA">🤖 IA</button>
          <button onClick={() => setHelpOpen(true)} className="pill-btn" title="Atalhos (?)">❓</button>
          <button onClick={() => setOptionsOpen(true)} className="pill-btn">⚙ Opções</button>
          <div className="flex-1 text-center text-xs opacity-60 truncate px-4 select-none">
            {session?.meta.name || ''}
          </div>
          <div className="text-[10px] opacity-30 select-none">v3.0</div>
        </header>
      )}

      <input ref={fileInputRef} type="file" accept=".cbz,.zip,.cbr,.rar,.pdf" className="hidden" onChange={handleFileSelect} />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0">
        <aside
          className="nekko-panel flex flex-col border-r border-[var(--line)] transition-all duration-200 ease-in-out overflow-hidden"
          style={{
            width: sidebarOpen ? `${settings.sidebarWidth}px` : '0px',
            minWidth: sidebarOpen ? `${settings.sidebarWidth}px` : '0px',
            opacity: sidebarOpen ? 1 : 0,
            borderRightWidth: sidebarOpen ? '1px' : '0px',
          }}
          aria-hidden={!sidebarOpen}
        >
          <LibrarySidebar
            library={library}
            positions={positions}
            onOpenRequest={handleOpenRequest}
            onRemove={removeFromLibrary}
          />
          <div className="p-3 border-t border-[var(--line)]">
            <button onClick={() => fileInputRef.current?.click()} className="pill-btn text-xs w-full transition-colors">
              ＋ Adicionar arquivo
            </button>
            <p className="text-[10px] opacity-40 mt-1.5 text-center">Arraste .cbz .zip .pdf para a janela</p>
          </div>
        </aside>

        {/* Reader Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div
            ref={stageRef}
            className="nekko-bg flex-1 relative overflow-hidden flex items-center justify-center"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {dragOver && (
              <div className="absolute inset-3 border-2 border-dashed border-[var(--accent)] rounded-2xl flex items-center justify-center text-xl text-[var(--accent)] bg-[var(--accent)]/5 z-40 animate-pulse">
                <div className="text-center">
                  <div className="text-4xl mb-2">📂</div>
                  <div>Solte para abrir</div>
                </div>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-[var(--line)] rounded-full" />
                    <div className="absolute inset-0 border-4 border-transparent border-t-[var(--accent)] rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
                  </div>
                  <p className="text-sm opacity-70 mb-2">Preparando livro…</p>
                  {loadingProgress > 0 && (
                    <div className="w-48 h-1.5 bg-[var(--line)] rounded-full mx-auto overflow-hidden">
                      <div className="h-full nekko-gradient rounded-full transition-all duration-300" style={{ width: `${loadingProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-white px-5 py-3 rounded-xl z-30 text-sm max-w-[80%] backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">⚠</span>
                  <span>{error}</span>
                  <button onClick={() => setError(null)} aria-label="Fechar aviso" className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">✕</button>
                </div>
              </div>
            )}

            {!session && !loading && (
              <div className="text-center opacity-60 select-none page-enter">
                <div className="nekko-cover w-44 h-60 mx-auto rounded-xl shadow-2xl flex items-center justify-center text-6xl mb-5">
                  🐱
                </div>
                <h1 className="text-2xl font-bold mb-2 opacity-100">NekkoReader</h1>
                <p className="text-sm leading-relaxed mb-4">
                  Leitor de Mangá, HQ e Livros<br />
                  <span className="text-xs opacity-60">Renderização sob demanda — livros grandes sem travar</span>
                </p>
                <div className="nekko-pill inline-flex flex-col gap-1.5 text-xs p-4 rounded-xl backdrop-blur-sm">
                  <p>Arraste um <b>.cbz .zip .pdf</b> aqui</p>
                  <p>ou clique em <b>📂 Abrir</b></p>
                  <p className="opacity-50 mt-1">
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--line)]">←</kbd>
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--line)]">→</kbd> páginas ·
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--line)] ml-1">F</kbd> tela cheia ·
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--line)] ml-1">M</kbd> mangá ·
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--line)] ml-1">?</kbd> ajuda
                  </p>
                </div>
              </div>
            )}

            {session && !loading && (
              <div key={pageKey} className={`flex gap-3 items-stretch justify-center p-4 w-full h-full ${settings.flipAnimation ? 'page-enter' : ''} ${manga && dblPage ? 'flex-row-reverse' : ''}`}>
                {displayPages.map((physicalIndex, idx) => (
                  <div key={`${viewIndex}-${idx}`} className="relative flex-1 max-w-full max-h-full min-w-0">
                    <PageImage
                      session={session}
                      pageIndex={physicalIndex}
                      fit={fit}
                      zoom={zoom}
                      dblPage={dblPage}
                    />
                  </div>
                ))}
              </div>
            )}

            {session && settings.clickZones && !loading && (
              <>
                <div
                  aria-hidden
                  className="absolute top-0 bottom-14 w-[28%] left-0 z-10 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => (manga ? goNext() : goPrev())}
                />
                <div
                  aria-hidden
                  className="absolute top-0 bottom-14 w-[28%] right-0 z-10 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => (manga ? goPrev() : goNext())}
                />
              </>
            )}

            {session && !loading && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <div className="absolute right-3 bottom-3 px-3 py-1 rounded-full text-xs backdrop-blur-sm bg-black/60 text-white tabular-nums">
                  {currentPage + 1} / {count}
                </div>
                <div className="h-1 bg-white/10">
                  <div
                    className="h-full nekko-gradient transition-all duration-200"
                    style={{ width: `${progress}%`, transform: manga ? 'scaleX(-1)' : undefined }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {!fullscreen && (
            <footer className="nekko-panel h-[52px] flex items-center gap-2 px-3 flex-none border-t border-[var(--line)]">
              <button onClick={goFirst} className="nav-btn" title="Primeira (Home)">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 5h2.4v14H6zM20 5v14L9.8 12z" /></svg>
              </button>
              <button onClick={manga ? goNext : goPrev} className="nav-btn" title="Anterior (←)">◀</button>
              <span className="min-w-[64px] text-center text-xs opacity-60 tabular-nums font-medium">
                {session ? `${currentPage + 1} / ${count}` : '– / –'}
              </span>
              <button onClick={manga ? goPrev : goNext} className="nav-btn" title="Próxima (→)">▶</button>
              <button onClick={goLast} className="nav-btn" title="Última (End)">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M15.6 5H18v14h-2.4zM4 5l10.2 7L4 19z" /></svg>
              </button>

              <div className="w-px h-6 mx-1 bg-current/10" />

              <button onClick={toggleManga} className={`tog-btn ${manga ? 'active' : ''}`} title="Modo mangá RTL (M)">Mangá</button>
              <button onClick={toggleDblPage} className={`tog-btn ${dblPage ? 'active' : ''}`} title="Página dupla (D)">Dupla</button>
              <button onClick={cycleFit} className="tog-btn" title="Ajuste (W)">Ajuste: {FIT_LABELS[fit]}</button>

              <span className="text-xs opacity-60 min-w-[40px] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomOut} className="nav-btn" title="Zoom - (Ctrl+Scroll)">−</button>
              <button onClick={zoomIn} className="nav-btn" title="Zoom + (Ctrl+Scroll)">＋</button>

              <div className="w-px h-6 mx-1 bg-current/10" />

              <button onClick={toggleFullscreen} className={`tog-btn ${fullscreen ? 'active' : ''}`} title="Tela cheia (F)">⛶ Tela cheia</button>

              {session && (
                <button onClick={closeBook} className="pill-btn text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 ml-auto transition-colors">
                  ✕ Fechar
                </button>
              )}
            </footer>
          )}
        </main>

        {/* AI Panel */}
        {aiPanelOpen && (
          <aside className="nekko-panel w-80 flex-none border-l border-[var(--line)] flex flex-col gap-3 p-3">
            <div className="flex justify-between items-center">
              <b className="text-sm">🤖 Assistente IA</b>
              <button onClick={() => setAiPanelOpen(false)} aria-label="Fechar painel de IA" className="w-6 h-6 rounded flex items-center justify-center text-sm opacity-60 hover:opacity-100 hover:bg-white/5 transition-colors">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button className="pill-btn text-xs">📝 Resumir página</button>
              <button className="pill-btn text-xs">📄 Resumir documento</button>
              <button className="pill-btn text-xs">📋 Copiar texto</button>
            </div>
            <textarea
              rows={2}
              placeholder="Pergunte algo sobre a página/documento… (Ctrl+Enter)"
              className="nekko-input w-full resize-none rounded-lg p-2 text-sm"
            />
            <button className="pill-btn text-xs bg-[var(--accent)] border-[var(--accent)] text-white w-full hover:brightness-110 transition-all">
              Perguntar ➤
            </button>
            <div className="nekko-pill flex-1 rounded-lg p-3 text-xs overflow-y-auto leading-relaxed">
              <p className="opacity-50">
                Configure a chave da IA em ⚙ Opções → IA.<br /><br />
                Compatível com:<br />
                • <b>Qwen</b> (Alibaba DashScope)<br />
                • <b>Ollama</b> (local, sem chave)<br />
                • <b>LM Studio</b> (local)<br />
                • <b>OpenRouter</b><br />
                • Qualquer API compatível com OpenAI
              </p>
            </div>
          </aside>
        )}
      </div>

      {optionsOpen && (
        <OptionsDialog
          settings={settings}
          onSave={(s) => { updateSettings(s); setOptionsOpen(false); }}
          onClose={() => setOptionsOpen(false)}
        />
      )}

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

export default App;
