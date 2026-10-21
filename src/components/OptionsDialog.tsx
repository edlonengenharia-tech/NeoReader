import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../utils/storage';

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const TABS = [
  { id: 'reading', label: '📖 Leitura' },
  { id: 'ui', label: '🎨 Interface' },
  { id: 'ia', label: '🤖 IA' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** Diálogo de opções com tipos corretos (antes usava `any`), acessível. */
export function OptionsDialog({ settings, onSave, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('reading');
  const [local, setLocal] = useState<Settings>({ ...settings });
  const dialogRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setLocal((p) => ({ ...p, [key]: value }));

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
        aria-label="Opções do NekkoReader"
        tabIndex={-1}
        className="nekko-panel w-[520px] max-h-[80vh] rounded-2xl p-6 overflow-y-auto shadow-2xl page-enter outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">⚙ Opções</h2>

        <div className="flex gap-1.5 mb-5" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
                tab === t.id ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg' : 'nekko-pill hover:bg-[var(--accent)]/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reading' && (
          <div className="flex flex-col gap-3.5">
            <Check label="Modo mangá por padrão" hint="Leitura direita→esquerda"
              checked={local.mangaByDefault} onChange={(v) => update('mangaByDefault', v)} />
            <Check label="Página dupla por padrão" hint="Mostra 2 páginas lado a lado"
              checked={local.doublePageByDefault} onChange={(v) => update('doublePageByDefault', v)} />
            <Check label="Animação de virada" hint="Efeito visual ao mudar de página"
              checked={local.flipAnimation} onChange={(v) => update('flipAnimation', v)} />
            <Check label="Zonas de clique" hint="Clique nos lados da tela para folhear"
              checked={local.clickZones} onChange={(v) => update('clickZones', v)} />
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Ajuste padrão</span>
              <select value={local.fit} onChange={(e) => update('fit', e.target.value as Settings['fit'])}
                className="nekko-input ml-auto px-3 py-1.5 rounded-lg text-sm">
                <option value="width">Largura</option>
                <option value="height">Altura</option>
                <option value="page">Página</option>
              </select>
            </div>
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Prefetch de páginas</span>
              <input type="range" min={0} max={6} step={1} value={local.prefetch}
                onChange={(e) => update('prefetch', parseInt(e.target.value, 10))}
                className="ml-auto w-32" />
              <span className="text-xs opacity-50 w-14 text-right">{local.prefetch} pág.</span>
            </div>
          </div>
        )}

        {tab === 'ui' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Tema</span>
              <select value={local.theme} onChange={(e) => update('theme', e.target.value as Settings['theme'])}
                className="nekko-input ml-auto px-3 py-1.5 rounded-lg text-sm">
                <option value="dark">🌙 Escuro</option>
                <option value="midnight">🌌 Meia-noite</option>
                <option value="light">☀️ Claro</option>
              </select>
            </div>
            <Check label="Mostrar biblioteca ao iniciar" hint="Painel lateral visível por padrão"
              checked={local.showLibraryOnStart} onChange={(v) => update('showLibraryOnStart', v)} />
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Largura da biblioteca</span>
              <input type="range" min={220} max={460} step={10} value={local.sidebarWidth}
                onChange={(e) => update('sidebarWidth', parseInt(e.target.value, 10))}
                className="ml-auto w-32" />
              <span className="text-xs opacity-50 w-10 text-right">{local.sidebarWidth}px</span>
            </div>
          </div>
        )}

        {tab === 'ia' && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
              <span className="font-medium">Provedor</span>
              <select value={local.aiProvider} onChange={(e) => update('aiProvider', e.target.value)}
                className="nekko-input ml-auto px-3 py-1.5 rounded-lg text-sm">
                <option value="qwen">Qwen (Alibaba)</option>
                <option value="openai_compat">Compatível OpenAI</option>
              </select>
            </div>
            <TextRow label="Chave API" value={local.aiKey} placeholder="sk-…" type="password"
              onChange={(v) => update('aiKey', v)} />
            <TextRow label="URL base" value={local.aiBaseUrl} placeholder="https://…/v1/chat/completions"
              onChange={(v) => update('aiBaseUrl', v)} />
            <TextRow label="Modelo" value={local.aiModel} placeholder="qwen-plus"
              onChange={(v) => update('aiModel', v)} />
            <div className="nekko-pill p-3 rounded-lg text-xs leading-relaxed">
              <p className="font-medium mb-1">💡 Dica:</p>
              <p className="opacity-60">
                Para uso 100% local, use Ollama:<br />
                <code className="text-[var(--accent2)]">http://localhost:11434/v1/chat/completions</code><br />
                Modelo: <code className="text-[var(--accent2)]">qwen2.5:7b</code> (sem chave necessária)
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-current/10">
          <button onClick={onClose} className="pill-btn hover:bg-white/10 transition-colors">Cancelar</button>
          <button
            onClick={() => onSave(local)}
            className="pill-btn bg-[var(--accent)] border-[var(--accent)] text-white hover:brightness-110 transition-all shadow-lg"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({ label, hint, checked, onChange }: {
  label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-[11px] opacity-50">{hint}</div>
      </div>
    </label>
  );
}

function TextRow({ label, value, placeholder, onChange, type = 'text' }: {
  label: string; value: string; placeholder: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm p-2 rounded-lg">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="nekko-input ml-auto px-3 py-1.5 rounded-lg text-sm w-48"
      />
    </div>
  );
}
