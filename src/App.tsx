import { useState, useRef, useCallback, useEffect } from 'react';
import { useReader } from './hooks/useReader';
import { isSupportedFile } from './utils/archive';

const FIT_LABELS: Record<string, string> = { width: 'Largura', height: 'Altura', page: 'Página' };

function App() {
  const reader = useReader();
  const {
    settings, updateSettings, positions, library,
    book, viewIndex, setViewIndex, manga, dblPage, fit, zoom, setZoom,
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
  const dropRef = useRef<HTMLDivElement>(null);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Page transition key
  useEffect(() => {
    setPageKey(k => k + 1);
  }, [viewIndex]);

  // Drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isSupportedFile(file)) {
      openFile(file);
    }
  }, [openFile]);

  // File input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openFile(file);
    if (e.target) e.target.value = '';
  }, [openFile]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey || !book) return;
    e.preventDefault();
    setZoom(Math.min(4, Math.max(0.25, zoom * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, [book, zoom, setZoom]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        // exited fullscreen - state will update
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Current pages to display
  const getDisplayPages = () => {
    if (!book) return [];
    const step = dblPage ? 2 : 1;
    const pages = [];
    for (let i = 0; i < step; i++) {
      const v = viewIndex + i;
      if (v >= book.count) break;
      const p = phys(v);
      pages.push(book.pages[p]);
    }
    return pages;
  };

  const displayPages = getDisplayPages();
  const currentPage = phys(viewIndex);
  const progress = book ? ((currentPage + 1) / book.count) * 100 : 0;

  // Recent items for "Continue Reading"
  const recentItems = Object.entries(positions)
    .sort(([, a], [, b]) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 6);

  const isDark = settings.theme !== 'light';
  const bgMain = isDark ? (settings.theme === 'midnight' ? 'bg-[#0a0c12]' : 'bg-[#14161b]') : 'bg-[#f3f4f8]';
  const bgPanel = isDark ? (settings.theme === 'midnight' ? 'bg-[#10131c]' : 'bg-[#1b1e26]') : 'bg-white';
  const borderMain = isDark ? (settings.theme === 'midnight' ? 'border-[#232a3d]' : 'border-[#2c313d]') : 'border-[#dde1ea]';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden ${bgMain} ${isDark ? 'text-[#e8eaf0]' : 'text-[#1d2230]'}`}
      data-theme={settings.theme}>

      {/* Title Bar */}
      {!fullscreen && (
        <header className={`h-11 flex items-center gap-2 px-2 flex-none border-b ${bgPanel} ${borderMain}`}>
          <span className="font-bold text-sm mr-2 select-none">🐱 NekoReader</span>
          <button onClick={() => fileInputRef.current?.click()} className="pill-btn">📂 Abrir</button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`pill-btn ${sidebarOpen ? 'ring-1 ring-[#7c5cff]/40' : ''}`}>📚 Biblioteca</button>
          <button onClick={() => setAiPanelOpen(!aiPanelOpen)} className={`pill-btn ${aiPanelOpen ? 'ring-1 ring-[#7c5cff]/40' : ''}`} title="Assistente IA">🤖 IA</button>
          <button onClick={() => setHelpOpen(true)} className="pill-btn" title="Atalhos (?)">❓</button>
          <button onClick={() => setOptionsOpen(true)} className="pill-btn">⚙ Opções</button>
          <div className="flex-1 text-center text-xs opacity-60 truncate px-4 select-none">
            {book?.name || ''}
          </div>
          <div className="text-[10px] opacity-30 select-none">v2.0 Web</div>
        </header>
      )}

      <input ref={fileInputRef} type="file" accept=".cbz,.zip,.pdf" className="hidden" onChange={handleFileSelect} />

      {/* Main Area */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside
          className={`flex flex-col border-r transition-all duration-250 ease-in-out overflow-hidden ${bgPanel} ${borderMain}`}
          style={{
            width: sidebarOpen ? `${settings.sidebarWidth}px` : '0px',
            minWidth: sidebarOpen ? `${settings.sidebarWidth}px` : '0px',
            opacity: sidebarOpen ? 1 : 0,
            borderRightWidth: sidebarOpen ? '1px' : '0px',
          }}
        >
          {/* Search */}
          <div className="p-3">
            <input
              type="search"
              placeholder="Buscar na biblioteca…"
              className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${isDark ? 'bg-[#20242e] border-[#2c313d] text-[#e8eaf0] placeholder:text-[#9aa1b2] focus:border-[#7c5cff]' : 'bg-[#f3f4f8] border-[#dde1ea] text-[#1d2230] focus:border-[#7c5cff]'}`}
            />
          </div>

          {/* Continue Reading */}
          {recentItems.length > 0 && (
            <section className="px-3 pb-2">
              <h3 className="text-[11px] uppercase tracking-wider opacity-50 mb-2 font-semibold">▶ Continuar lendo</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {recentItems.map(([id, pos]) => {
                  const item = library.find(l => l.id === id);
                  if (!item) return null;
                  return (
                    <div key={id}
                      className={`flex-none w-28 rounded-lg overflow-hidden border cursor-pointer hover:border-[#7c5cff] hover:shadow-lg hover:shadow-[#7c5cff]/10 transition-all duration-150 ${isDark ? 'bg-[#20242e] border-[#2c313d]' : 'bg-[#f3f4f8] border-[#dde1ea]'}`}
                      onClick={() => {
                        if (item.file) openFile(item.file);
                      }}>
                      <div className={`h-16 flex items-center justify-center text-2xl ${isDark ? 'bg-gradient-to-br from-[#2c313d] to-[#1b1e26]' : 'bg-gradient-to-br from-[#e8ebf2] to-[#dde1ea]'}`}>
                        {item.type === 'pdf' ? '📄' : '📕'}
                      </div>
                      <div className="p-1.5">
                        <div className="text-[10px] truncate font-medium">{item.name}</div>
                        <div className={`h-1 rounded mt-1 ${isDark ? 'bg-[#2c313d]' : 'bg-[#dde1ea]'}`}>
                          <div className="h-full bg-gradient-to-r from-[#7c5cff] to-[#4ecdc4] rounded transition-all" style={{ width: `${((pos.page + 1) / pos.total) * 100}%` }} />
                        </div>
                        <div className="text-[9px] opacity-40 mt-0.5">{pos.page + 1}/{pos.total}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Library */}
          <section className="flex-1 overflow-y-auto px-3 pb-3">
            <h3 className="text-[11px] uppercase tracking-wider opacity-50 mb-2 font-semibold">
              Todos os itens <span className="text-[#4ecdc4] font-bold">({library.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {library.map(item => (
                <div key={item.id}
                  className={`group rounded-lg overflow-hidden border cursor-pointer hover:-translate-y-0.5 hover:border-[#7c5cff] hover:shadow-lg hover:shadow-[#7c5cff]/10 transition-all duration-150 ${isDark ? 'bg-[#20242e] border-[#2c313d]' : 'bg-[#f3f4f8] border-[#dde1ea]'}`}
                  onClick={() => {
                    if (item.file) {
                      openFile(item.file);
                    } else {
                      setError(`"${item.name}" precisa ser reaberto. Arraste o arquivo para a janela.`);
                    }
                  }}
                >
                  <div className={`aspect-[3/4.2] flex items-center justify-center text-3xl relative ${isDark ? 'bg-gradient-to-br from-[#2c313d] to-[#1b1e26]' : 'bg-gradient-to-br from-[#e8ebf2] to-[#dde1ea]'}`}>
                    {item.type === 'pdf' ? '📄' : '📕'}
                    {!item.file && <div className="absolute top-1 right-1 text-[8px] bg-yellow-500/20 text-yellow-400 px-1 rounded">offline</div>}
                    <div className="absolute inset-0 bg-[#7c5cff]/0 group-hover:bg-[#7c5cff]/5 transition-colors" />
                  </div>
                  <div className="p-1.5 text-[10px] truncate font-medium">{item.name}</div>
                </div>
              ))}
            </div>
            {library.length === 0 && (
              <div className="text-center mt-8 opacity-40">
                <div className="text-4xl mb-2">📚</div>
                <p className="text-xs">Sua biblioteca está vazia</p>
                <p className="text-[10px] mt-1">Abra um arquivo para começar</p>
              </div>
            )}
            {library.some(item => !item.file) && (
              <p className="text-[10px] opacity-40 mt-2 text-center">
                💡 Alguns itens precisam ser reabertos após recarregar a página
              </p>
            )}
          </section>

          {/* Footer */}
          <div className={`p-3 border-t ${borderMain}`}>
            <button onClick={() => fileInputRef.current?.click()} className="pill-btn text-xs w-full hover:bg-[#7c5cff]/10 hover:border-[#7c5cff]/30 transition-colors">
              ＋ Adicionar arquivo
            </button>
            <p className="text-[10px] opacity-40 mt-1.5 text-center">Arraste .cbz .zip .pdf para a janela</p>
          </div>
        </aside>

        {/* Reader Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Drop Zone / Pages */}
          <div
            ref={dropRef}
            className={`flex-1 relative overflow-hidden flex items-center justify-center ${bgMain}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onWheel={handleWheel}
          >
            {/* Drag overlay */}
            {dragOver && (
              <div className="absolute inset-3 border-2 border-dashed border-[#7c5cff] rounded-2xl flex items-center justify-center text-xl text-[#7c5cff] bg-[#7c5cff]/5 z-40 animate-pulse">
                <div className="text-center">
                  <div className="text-4xl mb-2">📂</div>
                  <div>Solte para abrir</div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 border-4 border-[#2c313d] rounded-full" />
                    <div className="absolute inset-0 border-4 border-transparent border-t-[#7c5cff] rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
                  </div>
                  <p className="text-sm opacity-70 mb-2">Carregando páginas…</p>
                  {loadingProgress > 0 && (
                    <div className="w-48 h-1.5 bg-[#2c313d] rounded-full mx-auto overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#7c5cff] to-[#4ecdc4] rounded-full transition-all duration-300"
                        style={{ width: `${loadingProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-white px-5 py-3 rounded-xl z-30 text-sm max-w-[80%] backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">⚠</span>
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">✕</button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!book && !loading && (
              <div className="text-center opacity-60 select-none page-enter">
                <div className={`w-44 h-60 mx-auto rounded-xl shadow-2xl flex items-center justify-center text-6xl mb-5 ${isDark ? 'bg-gradient-to-br from-[#2c313d] to-[#1b1e26]' : 'bg-gradient-to-br from-[#e8ebf2] to-[#dde1ea]'}`}>
                  🐱
                </div>
                <h1 className="text-2xl font-bold mb-2 opacity-100">NekoReader</h1>
                <p className="text-sm leading-relaxed mb-4">
                  Leitor de Mangá, HQ e Livros<br />
                  <span className="text-xs opacity-60">Versão Web — sem dependências nativas!</span>
                </p>
                <div className={`inline-flex flex-col gap-1.5 text-xs p-4 rounded-xl ${isDark ? 'bg-[#1b1e26]/80' : 'bg-white/80'} backdrop-blur-sm`}>
                  <p>Arraste um <b>.cbz .zip .pdf</b> aqui</p>
                  <p>ou clique em <b>📂 Abrir</b></p>
                  <p className="opacity-50 mt-1">
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#2c313d]">←</kbd>
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#2c313d]">→</kbd> páginas · 
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#2c313d] ml-1">F</kbd> tela cheia · 
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#2c313d] ml-1">M</kbd> mangá · 
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-[#2c313d] ml-1">?</kbd> ajuda
                  </p>
                </div>
              </div>
            )}

            {/* Pages display */}
            {book && !loading && (
              <div key={pageKey} className={`flex gap-3 items-center justify-center p-4 w-full h-full page-enter ${manga && dblPage ? 'flex-row-reverse' : ''}`}>
                {displayPages.map((page, idx) => (
                  <div key={`${viewIndex}-${idx}`} className="relative max-w-full max-h-full">
                    <img
                      src={page.dataUrl}
                      alt={page.name}
                      className="block max-h-[calc(100vh-180px)] rounded-sm select-none"
                      style={{
                        maxWidth: fit === 'width' ? (dblPage ? '48%' : '96%') : fit === 'page' ? '90%' : undefined,
                        maxHeight: fit === 'height' ? 'calc(100vh - 180px)' : undefined,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
                        transition: 'transform 0.15s ease-out',
                      }}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Click zones */}
            {book && settings.clickZones && !loading && (
              <>
                <div
                  className="absolute top-0 bottom-14 w-[28%] left-0 z-10 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => manga ? goNext() : goPrev()}
                />
                <div
                  className="absolute top-0 bottom-14 w-[28%] right-0 z-10 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => manga ? goPrev() : goNext()}
                />
              </>
            )}

            {/* HUD */}
            {book && !loading && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <div className={`absolute right-3 bottom-3 px-3 py-1 rounded-full text-xs backdrop-blur-sm ${isDark ? 'bg-black/60' : 'bg-white/80 text-[#1d2230]'}`}>
                  {currentPage + 1} / {book.count}
                </div>
                <div className={`h-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-[#7c5cff] to-[#4ecdc4] transition-all duration-200"
                    style={{ width: `${progress}%`, transform: manga ? 'scaleX(-1)' : undefined }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          {!fullscreen && (
            <footer className={`h-[52px] flex items-center gap-2 px-3 flex-none border-t ${bgPanel} ${borderMain}`}>
              <button onClick={goFirst} className="nav-btn" title="Primeira (Home)">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 5h2.4v14H6zM20 5v14L9.8 12z" /></svg>
              </button>
              <button onClick={manga ? goNext : goPrev} className="nav-btn" title="Anterior (←)">◀</button>
              <span className="min-w-[64px] text-center text-xs opacity-60 tabular-nums font-medium">
                {book ? `${currentPage + 1} / ${book.count}` : '– / –'}
              </span>
              <button onClick={manga ? goPrev : goNext} className="nav-btn" title="Próxima (→)">▶</button>
              <button onClick={goLast} className="nav-btn" title="Última (End)">
                <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M15.6 5H18v14h-2.4zM4 5l10.2 7L4 19z" /></svg>
              </button>

              <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

              <button onClick={toggleManga} className={`tog-btn ${manga ? 'active' : ''}`} title="Modo mangá RTL (M)">
                Mangá
              </button>
              <button onClick={toggleDblPage} className={`tog-btn ${dblPage ? 'active' : ''}`} title="Página dupla (D)">
                Dupla
              </button>
              <button onClick={cycleFit} className="tog-btn" title="Ajuste (W)">
                Ajuste: {FIT_LABELS[fit]}
              </button>

              <span className="text-xs opacity-60 min-w-[40px] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomOut} className="nav-btn" title="Zoom - (Ctrl+Scroll)">−</button>
              <button onClick={zoomIn} className="nav-btn" title="Zoom + (Ctrl+Scroll)">＋</button>

              <div className={`w-px h-6 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

              <button onClick={toggleFullscreen} className={`tog-btn ${fullscreen ? 'active' : ''}`} title="Tela cheia (F)">
                ⛶ Tela cheia
              </button>

              {book && (
                <button onClick={closeBook} className="pill-btn text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 ml-auto transition-colors">
                  ✕ Fechar
                </button>
              )}
            </footer>
          )}
        </main>

        {/* AI Panel */}
        {aiPanelOpen && (
          <aside className={`w-80 flex-none border-l flex flex-col gap-3 p-3 transition-all ${bgPanel} ${borderMain}`}>
            <div className="flex justify-between items-center">
              <b className="text-sm">🤖 Assistente IA</b>
              <button onClick={() => setAiPanelOpen(false)} className="w-6 h-6 rounded flex items-center justify-center text-sm opacity-60 hover:opacity-100 hover:bg-white/5 transition-colors">✕</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button className="pill-btn text-xs">📝 Resumir página</button>
              <button className="pill-btn text-xs">📄 Resumir documento</button>
              <button className="pill-btn text-xs">📋 Copiar texto</button>
            </div>
            <textarea
              rows={2}
              placeholder="Pergunte algo sobre a página/documento… (Ctrl+Enter)"
              className={`w-full resize-none rounded-lg border p-2 text-sm outline-none transition-colors ${isDark ? 'bg-[#20242e] border-[#2c313d] placeholder:text-[#9aa1b2] focus:border-[#7c5cff]' : 'bg-[#f3f4f8] border-[#dde1ea] focus:border-[#7c5cff]'}`}
            />
            <button className="pill-btn text-xs bg-[#7c5cff] border-[#7c5cff] text-white w-full hover:bg-[#6a4ce6] transition-colors">
              Perguntar ➤
            </button>
            <div className={`flex-1 rounded-lg border p-3 text-xs overflow-y-auto leading-relaxed ${isDark ? 'bg-[#20242e] border-[#2c313d]' : 'bg-[#f3f4f8] border-[#dde1ea]'}`}>
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

      {/* Options Dialog */}
      {optionsOpen && (
        <OptionsDialog
          settings={settings}
          onSave={(s) => { updateSettings(s); setOptionsOpen(false); }}
          onClose={() => setOptionsOpen(false)}
          theme={settings.theme}
        />
      )}

      {/* Help Dialog */}
      {helpOpen && (
        <HelpDialog onClose={() => setHelpOpen(false)} theme={settings.theme} />
      )}
    </div>
  );
}

// Options Dialog Component
function OptionsDialog({ settings, onSave, onClose, theme }: {
  settings: any;
  onSave: (s: any) => void;
  onClose: () => void;
  theme: string;
}) {
  const [tab, setTab] = useState('reading');
  const [local, setLocal] = useState({ ...settings });

  const update = (key: string, value: any) => setLocal((p: any) => ({ ...p, [key]: value }));

  const isDark = theme !== 'light';
  const panelBg = isDark ? 'bg-[#20242e]' : 'bg-[#f3f4f8]';
  const borderColor = isDark ? 'border-[#2c313d]' : 'border-[#dde1ea]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-[520px] max-h-[80vh] rounded-2xl border p-6 overflow-y-auto shadow-2xl page-enter ${isDark ? 'bg-[#1b1e26] border-[#2c313d] text-[#e8eaf0]' : 'bg-white border-[#dde1ea] text-[#1d2230]'}`}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">⚙ Opções</h2>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          {['reading', 'ui', 'ia'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs border transition-all ${tab === t ? 'bg-[#7c5cff] border-[#7c5cff] text-white shadow-lg shadow-[#7c5cff]/20' : `${panelBg} ${borderColor} hover:bg-[#7c5cff]/10`}`}>
              {t === 'reading' ? '📖 Leitura' : t === 'ui' ? '🎨 Interface' : '🤖 IA'}
            </button>
          ))}
        </div>

        {/* Reading Tab */}
        {tab === 'reading' && (
          <div className="flex flex-col gap-3.5">
            <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <input type="checkbox" checked={local.mangaByDefault} onChange={e => update('mangaByDefault', e.target.checked)} />
              <div>
                <div className="font-medium">Modo mangá por padrão</div>
                <div className="text-[11px] opacity-50">Leitura direita→esquerda</div>
              </div>
            </label>
            <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <input type="checkbox" checked={local.doublePageByDefault} onChange={e => update('doublePageByDefault', e.target.checked)} />
              <div>
                <div className="font-medium">Página dupla por padrão</div>
                <div className="text-[11px] opacity-50">Mostra 2 páginas lado a lado</div>
              </div>
            </label>
            <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <input type="checkbox" checked={local.flipAnimation} onChange={e => update('flipAnimation', e.target.checked)} />
              <div>
                <div className="font-medium">Animação de virada</div>
                <div className="text-[11px] opacity-50">Efeito visual ao mudar de página</div>
              </div>
            </label>
            <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <input type="checkbox" checked={local.clickZones} onChange={e => update('clickZones', e.target.checked)} />
              <div>
                <div className="font-medium">Zonas de clique</div>
                <div className="text-[11px] opacity-50">Clique nos lados da tela para folhear</div>
              </div>
            </label>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Ajuste padrão</span>
              <select value={local.fit} onChange={e => update('fit', e.target.value)}
                className={`ml-auto px-3 py-1.5 rounded-lg border text-sm ${panelBg} ${borderColor}`}>
                <option value="width">Largura</option>
                <option value="height">Altura</option>
                <option value="page">Página</option>
              </select>
            </div>
          </div>
        )}

        {/* UI Tab */}
        {tab === 'ui' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Tema</span>
              <select value={local.theme} onChange={e => update('theme', e.target.value)}
                className={`ml-auto px-3 py-1.5 rounded-lg border text-sm ${panelBg} ${borderColor}`}>
                <option value="dark">🌙 Escuro</option>
                <option value="midnight">🌌 Meia-noite</option>
                <option value="light">☀️ Claro</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <input type="checkbox" checked={local.showLibraryOnStart} onChange={e => update('showLibraryOnStart', e.target.checked)} />
              <div>
                <div className="font-medium">Mostrar biblioteca ao iniciar</div>
                <div className="text-[11px] opacity-50">Painel lateral visível por padrão</div>
              </div>
            </label>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Largura da biblioteca</span>
              <input type="range" min={220} max={460} step={10} value={local.sidebarWidth}
                onChange={e => update('sidebarWidth', parseInt(e.target.value))}
                className="ml-auto w-32" />
              <span className="text-xs opacity-50 w-10 text-right">{local.sidebarWidth}px</span>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {tab === 'ia' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Provedor</span>
              <select value={local.aiProvider} onChange={e => update('aiProvider', e.target.value)}
                className={`ml-auto px-3 py-1.5 rounded-lg border text-sm ${panelBg} ${borderColor}`}>
                <option value="qwen">Qwen (Alibaba)</option>
                <option value="openai_compat">Compatível OpenAI</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Chave API</span>
              <input type="password" value={local.aiKey} onChange={e => update('aiKey', e.target.value)}
                placeholder="sk-…" className={`ml-auto px-3 py-1.5 rounded-lg border text-sm w-48 ${panelBg} ${borderColor}`} />
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">URL base</span>
              <input type="text" value={local.aiBaseUrl} onChange={e => update('aiBaseUrl', e.target.value)}
                placeholder="https://…/v1/chat/completions" className={`ml-auto px-3 py-1.5 rounded-lg border text-sm w-48 ${panelBg} ${borderColor}`} />
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Modelo</span>
              <input type="text" value={local.aiModel} onChange={e => update('aiModel', e.target.value)}
                placeholder="qwen-plus" className={`ml-auto px-3 py-1.5 rounded-lg border text-sm w-48 ${panelBg} ${borderColor}`} />
            </div>
            <div className={`p-3 rounded-lg text-xs leading-relaxed ${isDark ? 'bg-[#20242e]' : 'bg-[#f3f4f8]'}`}>
              <p className="font-medium mb-1">💡 Dica:</p>
              <p className="opacity-60">
                Para uso 100% local, use Ollama:<br />
                <code className="text-[#4ecdc4]">http://localhost:11434/v1/chat/completions</code><br />
                Modelo: <code className="text-[#4ecdc4]">qwen2.5:7b</code> (sem chave necessária)
              </p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-current/10">
          <button onClick={onClose} className="pill-btn hover:bg-white/10 transition-colors">Cancelar</button>
          <button onClick={() => onSave(local)} className="pill-btn bg-[#7c5cff] border-[#7c5cff] text-white hover:bg-[#6a4ce6] transition-colors shadow-lg shadow-[#7c5cff]/20">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// Help Dialog
function HelpDialog({ onClose, theme }: { onClose: () => void; theme: string }) {
  const isDark = theme !== 'light';

  const shortcuts = [
    { keys: '← →', desc: 'Página anterior / próxima' },
    { keys: 'Home / End', desc: 'Primeira / última página' },
    { keys: 'F', desc: 'Tela cheia' },
    { keys: 'M', desc: 'Modo mangá (RTL)' },
    { keys: 'D', desc: 'Página dupla' },
    { keys: 'W', desc: 'Ciclo ajuste (Largura/Altura/Página)' },
    { keys: '+ / -', desc: 'Zoom in / out' },
    { keys: 'Ctrl + Scroll', desc: 'Zoom com roda do mouse' },
    { keys: 'Tab', desc: 'Mostrar/ocultar biblioteca' },
    { keys: 'Esc', desc: 'Sair da tela cheia' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-[440px] rounded-2xl border p-6 shadow-2xl page-enter ${isDark ? 'bg-[#1b1e26] border-[#2c313d] text-[#e8eaf0]' : 'bg-white border-[#dde1ea] text-[#1d2230]'}`}
        onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">⌨ Atalhos do teclado</h2>
        <div className="flex flex-col gap-2">
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-center gap-3 text-sm">
              <kbd className={`px-2 py-1 rounded text-xs font-mono min-w-[80px] text-center ${isDark ? 'bg-[#2c313d]' : 'bg-[#e8ebf2]'}`}>
                {s.keys}
              </kbd>
              <span className="opacity-70">{s.desc}</span>
            </div>
          ))}
        </div>

        <div className={`mt-5 p-3 rounded-lg text-xs leading-relaxed ${isDark ? 'bg-[#20242e]' : 'bg-[#f3f4f8]'}`}>
          <p className="font-medium mb-1">📁 Formatos suportados:</p>
          <p className="opacity-60">
            <b>.cbz</b> / <b>.zip</b> — via JSZip (JavaScript puro)<br />
            <b>.pdf</b> — via PDF.js (renderização no browser)<br />
            <span className="text-[#4ecdc4]">✨ Sem dependências nativas — funciona em qualquer navegador!</span>
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="pill-btn bg-[#7c5cff] border-[#7c5cff] text-white hover:bg-[#6a4ce6] transition-colors">
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
