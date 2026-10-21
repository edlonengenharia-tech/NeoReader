// PageProvider — carregamento LAZY por página, fora da thread principal.
// Padrão inspirado no ACBR (worker-page.js + cache por bytes + jobId):
// nada de pré-renderizar todas as páginas como dataURL (estouro de memória).
import type { ArchiveWorkerRequest, ArchivePageResponse } from '../workers/archive.worker';
import { pageCache, RefCountedUrl } from './blobCache';
import { isCBRFile, isArchiveFile, isPDFFile, getDesktopBridge } from './archive';
import { PdfDocumentPool } from './pdf';

export interface BookMeta {
  id: string;
  name: string;
  count: number;
}

type Listener = () => void;

let workerSingleton: Worker | null = null;
function getWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(new URL('../workers/archive.worker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return workerSingleton;
}

class ArchiveSource {
  private buffer: ArrayBuffer | null = null;
  private rarEntries: Array<{ name: string; bytes: Uint8Array }> | null = null;
  private pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void }>();
  private urls = new RefCountedUrl();

  constructor(readonly file: File) {
    const w = getWorker();
    w.onmessage = (e: MessageEvent<ArchivePageResponse>) => {
      const res = e.data;
      if (res.type !== 'page') return;
      const p = this.pending.get(res.index);
      if (!p) return;
      this.pending.delete(res.index);
      if (res.error || !res.blob) p.reject(new Error(res.error || 'Falha ao extrair página'));
      else p.resolve(res.blob);
    };
  }

  async init(): Promise<string[]> {
    if (isCBRFile(this.file)) {
      const bridge = getDesktopBridge();
      if (!bridge) {
        throw new Error('Arquivos .cbr (RAR) abrem no app desktop. Gere o .exe com o criar-exe.bat ou converta para .cbz.');
      }
      const bytes = new Uint8Array(await this.file.arrayBuffer());
      this.rarEntries = await bridge.extractRar(bytes);
    } else {
      this.buffer = await this.file.arrayBuffer();
    }
    return this.listNames();
  }

  private async listNames(): Promise<string[]> {
    const w = getWorker();
    return new Promise<string[]>((resolve, reject) => {
      const handler = (e: MessageEvent<{ type: string; names?: string[] }>) => {
        if (e.data.type === 'list') {
          w.removeEventListener('message', handler);
          resolve(e.data.names || []);
        }
      };
      w.addEventListener('message', handler);
      const req: ArchiveWorkerRequest = {
        type: 'list',
        source: this.buffer!,
        isRar: !!this.rarEntries,
        rarEntries: this.rarEntries ?? undefined,
      };
      w.postMessage(req);
      setTimeout(() => reject(new Error('Tempo esgotado ao ler o arquivo.')), 60_000);
    });
  }

  async getPageBlob(index: number): Promise<Blob> {
    const key = `${this.file.name}:${this.file.size}:${index}`;
    const cached = pageCache.get(key);
    if (cached) return cached;
    const w = getWorker();
    const blob = await new Promise<Blob>((resolve, reject) => {
      this.pending.set(index, { resolve, reject });
      const req: ArchiveWorkerRequest = {
        type: 'page',
        index,
        source: this.buffer!,
        isRar: !!this.rarEntries,
        rarEntries: this.rarEntries ?? undefined,
      };
      w.postMessage(req);
    });
    pageCache.set(key, blob);
    return blob;
  }

  async getPageUrl(index: number): Promise<string> {
    const blob = await this.getPageBlob(index);
    return this.urls.create(blob);
  }

  releaseUrl(url: string) {
    this.urls.release(url);
  }

  dispose() {
    this.urls.releaseAll();
    this.buffer = null;
    this.rarEntries = null;
  }
}

class PdfSource {
  private urls = new RefCountedUrl();
  constructor(private doc: pdfjsWrap.PDFDocumentProxy, readonly count: number) {}

  async getPageUrl(index: number): Promise<string> {
    const key = `pdf:${index}`;
    const cached = pageCache.get(key);
    if (cached) return this.urls.create(cached);
    const blob = await renderPdfPageToBlob(this.doc, index + 1);
    pageCache.set(`pdf:${index}`, blob);
    return this.urls.create(blob);
  }

  releaseUrl(url: string) {
    this.urls.release(url);
  }

  dispose() {
    this.urls.releaseAll();
    this.doc.cleanup();
  }
}

// Renderização PDF com canvas Offscreen quando disponível (fora do layout principal)
async function renderPdfPageToBlob(doc: pdfjsWrap.PDFDocumentProxy, pageNumber: number): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2 });
  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(viewport.width, viewport.height);
    ctx = canvas.getContext('2d')!;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx = canvas.getContext('2d')!;
  }
  await page.render({ canvasContext: ctx as CanvasRenderingContext2D, viewport }).promise;
  page.cleanup();
  if (canvas instanceof OffscreenCanvas) return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  return new Promise<Blob>((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao renderizar página do PDF'))),
      'image/jpeg',
      0.92,
    ),
  );
}

declare namespace pdfjsWrap {
  type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;
}

export type PageSource = ArchiveSource | PdfSource;

/**
 * Gerencia o livro aberto: metadados, fonte de páginas, prefetch vizinho
 * (settings.prefetch) e URLs com referência — componente <PageImage /> consome isto.
 */
export class BookSession {
  readonly meta: BookMeta;
  readonly source: PageSource;
  private listeners = new Set<Listener>();
  /** índices físicos já totalmente carregados (para animação/prefetch) */
  readonly loaded = new Set<number>();

  constructor(meta: BookMeta, source: PageSource) {
    this.meta = meta;
    this.source = source;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  markLoaded(index: number) {
    if (!this.loaded.has(index)) {
      this.loaded.add(index);
      this.notify();
    }
  }

  /** Pré-carrega os vizinhos dentro da janela (padrão prefetch do NekoReader/ACBR). */
  prefetchAround(index: number, windowSize: number) {
    for (let d = 1; d <= windowSize; d++) {
      for (const i of [index - d, index + d]) {
        if (i >= 0 && i < this.meta.count && !this.loaded.has(i)) {
          this.getPageUrl(i)
            .then((url) => {
              this.markLoaded(i);
              this.releaseUrl(url);
            })
            .catch(() => {});
        }
      }
    }
  }

  async getPageUrl(index: number): Promise<string> {
    const url = await this.source.getPageUrl(index);
    return url;
  }

  releaseUrl(url: string) {
    this.source.releaseUrl(url);
  }

  dispose() {
    this.listeners.clear();
    this.loaded.clear();
    pageCache.invalidateOldGeneration(); // novo jobId — como cacheJobId do ACBR
    this.source.dispose();
  }
}

// ---------- API de alto nível ----------
let current: BookSession | null = null;

export async function openBook(file: File, onProgress?: (p: number) => void): Promise<BookSession> {
  closeCurrentBook();
  if (isPDFFile(file)) {
    onProgress?.(10);
    const doc = await PdfDocumentPool.load(file);
    onProgress?.(100);
    const session = new BookSession(
      { id: `${file.name}_${file.size}`, name: file.name, count: doc.numPages },
      new PdfSource(doc, doc.numPages),
    );
    current = session;
    return session;
  }
  if (isArchiveFile(file) || isCBRFile(file)) {
    onProgress?.(10);
    const src = new ArchiveSource(file);
    const names = await src.init();
    onProgress?.(100);
    if (names.length === 0) throw new Error('Nenhuma página encontrada no arquivo.');
    const session = new BookSession(
      { id: `${file.name}_${file.size}`, name: file.name, count: names.length },
      src,
    );
    current = session;
    return session;
  }
  throw new Error('Formato não suportado. Use .cbz, .cbr, .zip, .rar ou .pdf');
}

export function currentBook(): BookSession | null {
  return current;
}

export function closeCurrentBook() {
  if (current) {
    current.dispose();
    current = null;
  }
}
