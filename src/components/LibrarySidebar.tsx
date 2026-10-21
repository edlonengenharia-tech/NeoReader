import { useMemo, useState } from 'react';
import type { LibraryItemMeta, ReadPosition } from '../utils/storage';

interface Props {
  library: LibraryItemMeta[];
  positions: Record<string, ReadPosition>;
  onOpenRequest: (item: LibraryItemMeta) => void;
  onRemove: (id: string) => void;
}

const TYPE_ICON: Record<string, string> = { pdf: '📄', cbr: '📕', cbz: '📚' };

/** Sidebar de biblioteca com BUSCA FUNCIONAL (antes era um input decorativo). */
export function LibrarySidebar({ library, positions, onOpenRequest, onRemove }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...library].sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
    return q ? sorted.filter(i => i.name.toLowerCase().includes(q)) : sorted;
  }, [library, query]);

  const recent = useMemo(() => {
    return Object.entries(positions)
      .filter(([id]) => library.some(l => l.id === id))
      .sort(([, a], [, b]) => (b.ts || 0) - (a.ts || 0))
      .slice(0, 6);
  }, [positions, library]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na biblioteca…"
          aria-label="Buscar na biblioteca"
          className="nekko-input w-full px-3 py-2 rounded-lg text-sm"
        />
      </div>

      {recent.length > 0 && (
        <section className="px-3 pb-2">
          <h3 className="text-[11px] uppercase tracking-wider opacity-50 mb-2 font-semibold">▶ Continuar lendo</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {recent.map(([id, pos]) => {
              const item = library.find(l => l.id === id);
              if (!item) return null;
              return (
                <button
                  key={id}
                  onClick={() => onOpenRequest(item)}
                  title={`Continuar "${item.name}" — pág. ${pos.page + 1}/${pos.total}`}
                  className="nekko-card flex-none w-28 rounded-lg overflow-hidden text-left cursor-pointer transition-all duration-150"
                >
                  <div className="nekko-cover h-16 flex items-center justify-center text-2xl">
                    {TYPE_ICON[item.type] || '📕'}
                  </div>
                  <div className="p-1.5">
                    <div className="text-[10px] truncate font-medium">{item.name}</div>
                    <div className="h-1 rounded mt-1 bg-[var(--line)]">
                      <div className="h-full nekko-gradient rounded transition-all" style={{ width: `${((pos.page + 1) / Math.max(pos.total, 1)) * 100}%` }} />
                    </div>
                    <div className="text-[9px] opacity-40 mt-0.5">{pos.page + 1}/{pos.total}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        <h3 className="text-[11px] uppercase tracking-wider opacity-50 mb-2 font-semibold">
          Todos os itens <span className="text-[var(--accent2)] font-bold">({filtered.length})</span>
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(item => {
            const pos = positions[item.id];
            return (
              <div key={item.id} className="group relative">
                <button
                  onClick={() => onOpenRequest(item)}
                  title={`Reabrir "${item.name}"`}
                  className="nekko-card w-full rounded-lg overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="nekko-cover aspect-[3/4.2] flex items-center justify-center text-3xl relative">
                    {TYPE_ICON[item.type] || '📕'}
                    <div className="absolute inset-0 group-hover:bg-[var(--accent)]/5 transition-colors" />
                  </div>
                  <div className="p-1.5">
                    <div className="text-[10px] truncate font-medium">{item.name}</div>
                    {pos && (
                      <div className="text-[9px] opacity-40 mt-0.5">{pos.page + 1}/{pos.total}</div>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  aria-label={`Remover "${item.name}" da biblioteca`}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        {library.length === 0 && (
          <div className="text-center mt-8 opacity-40">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-xs">Sua biblioteca está vazia</p>
            <p className="text-[10px] mt-1">Abra um arquivo para começar</p>
          </div>
        )}
        {library.length > 0 && filtered.length === 0 && (
          <p className="text-[11px] opacity-50 text-center mt-4">Nenhum resultado para “{query}”.</p>
        )}
        {library.length > 0 && (
          <p className="text-[10px] opacity-40 mt-3 text-center">
            💡 Para reabrir, selecione o mesmo arquivo novamente
          </p>
        )}
      </section>
    </div>
  );
}
