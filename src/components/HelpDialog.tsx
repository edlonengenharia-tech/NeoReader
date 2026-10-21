import { useEffect, useRef } from 'react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: '← →', desc: 'Página anterior / próxima' },
  { keys: 'Home / End', desc: 'Primeira / última página' },
  { keys: 'F', desc: 'Tela cheia' },
  { keys: 'M', desc: 'Modo mangá (RTL)' },
  { keys: 'D', desc: 'Página dupla' },
  { keys: 'W', desc: 'Ciclo ajuste (Largura/Altura/Página)' },
  { keys: '+ / -', desc: 'Zoom in / out' },
  { keys: 'Ctrl + Scroll', desc: 'Zoom com roda do mouse' },
  { keys: 'Tab', desc: 'Mostrar/ocultar biblioteca' },
  { keys: 'Esc', desc: 'Sair da tela cheia / fechar diálogo' },
];

/** Diálogo de atalhos — acessível (role/aria/Esc). */
export function HelpDialog({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Atalhos do teclado"
        tabIndex={-1}
        className="nekko-panel w-[440px] rounded-2xl p-6 shadow-2xl page-enter outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">⌨ Atalhos do teclado</h2>
        <div className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center gap-3 text-sm">
              <kbd className="px-2 py-1 rounded text-xs font-mono min-w-[80px] text-center bg-[var(--line)]">
                {s.keys}
              </kbd>
              <span className="opacity-70">{s.desc}</span>
            </div>
          ))}
        </div>

        <div className="nekko-pill mt-5 p-3 rounded-lg text-xs leading-relaxed">
          <p className="font-medium mb-1">📁 Formatos suportados:</p>
          <p className="opacity-60">
            <b>.cbz</b> / <b>.zip</b> — JSZip em Web Worker (páginas sob demanda)<br />
            <b>.cbr</b> / <b>.rar</b> — app desktop (Electron + node-unrar-js)<br />
            <b>.pdf</b> — PDF.js com worker local (funciona offline)<br />
            <span className="text-[var(--accent2)]">✨ Renderização lazy + cache LRU — livros grandes sem travar</span>
          </p>
        </div>

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="pill-btn bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-110 transition-all">
            Entendi!
          </button>
        </div>
      </div>
    </div>
  );
}
