// LocalStorage persistence for settings and reading positions
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

export interface LibraryItem {
  id: string;
  name: string;
  file: File;
  type: string;
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

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('neko-settings');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings) {
  localStorage.setItem('neko-settings', JSON.stringify(s));
}

export function loadPositions(): Record<string, ReadPosition> {
  try {
    const raw = localStorage.getItem('neko-positions');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function savePositions(p: Record<string, ReadPosition>) {
  localStorage.setItem('neko-positions', JSON.stringify(p));
}

export function loadLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem('neko-library');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLibrary(items: LibraryItem[]) {
  // We can't persist File objects, so just save metadata
  const serializable = items.map(i => ({
    id: i.id,
    name: i.name,
    type: i.type,
    lastOpened: i.lastOpened,
  }));
  localStorage.setItem('neko-library', JSON.stringify(serializable));
}
