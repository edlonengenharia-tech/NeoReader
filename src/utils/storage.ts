// Persistência do NekkoReader.
// - Desktop (Electron): JSON em arquivo no userData via ponte `nekkoStore`
//   (padrão ACBR: favorites/history/settings persistidos pelo main process).
// - Web: localStorage com migração automática das chaves antigas "neko-*".
export interface Settings {
  theme: 'dark' | 'midnight' | 'light';
  mangaByDefault: boolean;
  doublePageByDefault: boolean;
  fit: 'width' | 'height' | 'page';
  flipAnimation: boolean;
  prefetch: number;
  clickZones: boolean;
  showLibraryOnStart: boolean;
  sidebarWidth: number;
  keepAwake: boolean;
  aiProvider: string;
  aiKey: string;
  aiBaseUrl: string;
  aiModel: string;
}

export interface ReadPosition {
  page: number;
  total: number;
  ts: number;
}

/** Item de biblioteca SEM objeto File (persistível). Reabrir via input/drag-drop. */
export interface LibraryItemMeta {
  id: string;
  name: string;
  type: string;
  size?: number;
  lastOpened?: number;
}

const DEFAULTS: Settings = {
  theme: 'dark',
  mangaByDefault: false,
  doublePageByDefault: false,
  fit: 'width',
  flipAnimation: true,
  prefetch: 3,
  clickZones: true,
  showLibraryOnStart: true,
  sidebarWidth: 300,
  keepAwake: true,
  aiProvider: 'qwen',
  aiKey: '',
  aiBaseUrl: '',
  aiModel: '',
};

interface StoreBridge {
  readJson: (name: string) => Promise<unknown>;
  writeJson: (name: string, data: unknown) => Promise<void>;
}

function getStore(): StoreBridge | undefined {
  return (window as unknown as { nekkoStore?: StoreBridge }).nekkoStore;
}

const LEGACY_KEYS: Record<string, string> = {
  settings: 'neko-settings',
  positions: 'neko-positions',
  library: 'neko-library',
};

async function writeKey<T>(name: string, value: T): Promise<void> {
  const store = getStore();
  if (store) {
    try {
      await store.writeJson(name, value);
      return;
    } catch {}
  }
  try {
    localStorage.setItem(`nekko-${name}`, JSON.stringify(value));
  } catch {}
}

async function readKey<T>(name: string, fallback: T): Promise<T> {
  const store = getStore();
  if (store) {
    try {
      const v = await store.readJson(name);
      if (v != null) return v as T;
    } catch {}
  }
  try {
    const raw = localStorage.getItem(`nekko-${name}`) ?? localStorage.getItem(LEGACY_KEYS[name] ?? '');
    if (raw) {
      // migração: grava no destino novo (arquivo desktop ou chave nova)
      const parsed = JSON.parse(raw) as T;
      await writeKey(name, parsed);
      if (LEGACY_KEYS[name]) localStorage.removeItem(LEGACY_KEYS[name]);
      return parsed;
    }
  } catch {}
  return fallback;
}

// ---------- API síncrona (cache hidratado antes do primeiro render) ----------
let cacheSettings: Settings = { ...DEFAULTS };
let cachePositions: Record<string, ReadPosition> = {};
let cacheLibrary: LibraryItemMeta[] = [];
let hydrated = false;

/** Carrega tudo do disco/localStorage uma única vez antes de renderizar a UI. */
export async function hydrate(): Promise<void> {
  if (hydrated) return;
  const [s, p, l] = await Promise.all([
    readKey<Settings>('settings', { ...DEFAULTS }),
    readKey<Record<string, ReadPosition>>('positions', {}),
    readKey<LibraryItemMeta[]>('library', []),
  ]);
  cacheSettings = { ...DEFAULTS, ...(s || {}) };
  cachePositions = p || {};
  cacheLibrary = Array.isArray(l) ? l : [];
  hydrated = true;
}

export function loadSettings(): Settings {
  return { ...DEFAULTS, ...cacheSettings };
}

export function saveSettings(s: Settings) {
  cacheSettings = s;
  void writeKey('settings', s);
}

export function loadPositions(): Record<string, ReadPosition> {
  return cachePositions;
}

export function savePositions(p: Record<string, ReadPosition>) {
  cachePositions = p;
  void writeKey('positions', p);
}

export function loadLibrary(): LibraryItemMeta[] {
  return cacheLibrary;
}

export function saveLibrary(items: LibraryItemMeta[]) {
  cacheLibrary = items;
  void writeKey('library', items);
}
