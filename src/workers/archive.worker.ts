/// <reference lib="webworker" />
// Worker de extração de páginas CBZ/CBR — roda fora da thread principal
// (padrão ACBR: worker-page.js com cacheJobId). Extrai SOMENTE a página pedida.
import JSZip from 'jszip';

export interface ArchiveWorkerRequest {
  type: 'list' | 'page';
  source: ArrayBuffer | Uint8Array;
  isRar: boolean;
  rarEntries?: Array<{ name: string; bytes: Uint8Array }>;
  index?: number;
}

export interface ArchiveWorkerResponse {
  type: 'list';
  names: string[];
}

export interface ArchivePageResponse {
  type: 'page';
  index: number;
  blob?: Blob;
  error?: string;
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];

const isImage = (name: string) => IMAGE_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function mimeFromName(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || 'jpg';
  switch (ext) {
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'bmp': return 'image/bmp';
    case 'avif': return 'image/avif';
    default: return 'image/jpeg';
  }
}

async function listZip(source: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(source);
  return Object.entries(zip.files)
    .filter(([name, entry]) => !entry.dir && isImage(name))
    .map(([name]) => name)
    .sort(byName);
}

async function readZipPage(source: ArrayBuffer, index: number): Promise<Blob> {
  const names = await listZip(source);
  const name = names[index];
  if (!name) throw new Error(`Página ${index + 1} não encontrada no arquivo.`);
  const zip = await JSZip.loadAsync(source);
  const entry = zip.file(name);
  if (!entry) throw new Error(`Entrada ausente: ${name}`);
  return entry.async('blob');
}

self.onmessage = async (e: MessageEvent<ArchiveWorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === 'list') {
      let names: string[];
      if (req.isRar) {
        names = (req.rarEntries || []).map((x) => x.name).filter(isImage).sort(byName);
      } else {
        names = await listZip(req.source as ArrayBuffer);
      }
      const res: ArchiveWorkerResponse = { type: 'list', names };
      (self as unknown as Worker).postMessage(res);
      return;
    }

    if (req.type === 'page') {
      const index = req.index ?? 0;
      let blob: Blob;
      if (req.isRar) {
        const entries = (req.rarEntries || [])
          .filter((x) => isImage(x.name))
          .sort((a, b) => byName(a.name, b.name));
        const entry = entries[index];
        if (!entry) throw new Error(`Página ${index + 1} não encontrada no RAR.`);
        blob = new Blob([entry.bytes as unknown as BlobPart], { type: mimeFromName(entry.name) });
      } else {
        blob = await readZipPage(req.source as ArrayBuffer, index);
      }
      const res: ArchivePageResponse = { type: 'page', index, blob };
      (self as unknown as Worker).postMessage(res, [blob]);
    }
  } catch (err) {
    const res: ArchivePageResponse = {
      type: 'page',
      index: req.index ?? -1,
      error: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(res);
  }
};
