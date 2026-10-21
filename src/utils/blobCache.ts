// Cache LRU limitado por BYTES (padrão inspirado no ACBR: setCacheSize/estatísticas)
// Páginas são mantidas como Blob (não dataURL) para uso com URL.createObjectURL.
const MAX_BYTES = 300 * 1024 * 1024; // 300 MB

interface Entry {
  blob: Blob;
  rev: number; // invalidação por "cacheJobId" ao trocar de livro
  size: number;
}

class ByteLRUCache {
  private map = new Map<string, Entry>();
  private totalBytes = 0;
  private generation = 0;
  private seq = 0;

  get bytes() {
    return this.totalBytes;
  }

  get count() {
    return this.map.size;
  }

  get(key: string): Blob | undefined {
    const e = this.map.get(key);
    if (!e || e.rev !== this.generation) {
      if (e) this.delete(key);
      return undefined;
    }
    // touch (LRU): re-inserir move para o fim do Map
    this.map.delete(key);
    this.map.set(key, e);
    return e.blob;
  }

  set(key: string, blob: Blob) {
    if (this.map.has(key)) this.delete(key);
    const size = blob.size || 1;
    this.map.set(key, { blob, rev: this.generation, size });
    this.totalBytes += size;
    this.evict();
  }

  delete(key: string) {
    const e = this.map.get(key);
    if (e) {
      this.totalBytes -= e.size;
      this.map.delete(key);
    }
  }

  /** Invalida todo o conteúdo anterior (novo jobId), como `cacheJobId` do ACBR. */
  invalidateOldGeneration() {
    this.generation++;
    this.map.clear();
    this.totalBytes = 0;
  }

  private evict() {
    const it = this.map.keys();
    while (this.totalBytes > MAX_BYTES && this.map.size > 0) {
      const oldest = it.next().value as string | undefined;
      if (oldest === undefined) break;
      this.delete(oldest);
    }
    void this.seq;
  }
}

export const pageCache = new ByteLRUCache();

/** Empacota um Blob em Object URL com contagem de referências. */
export class RefCountedUrl {
  private urls = new Map<Blob, { url: string; refs: number }>();

  create(blob: Blob): string {
    const hit = this.urls.get(blob);
    if (hit) {
      hit.refs++;
      return hit.url;
    }
    const url = URL.createObjectURL(blob);
    this.urls.set(blob, { url, refs: 1 });
    return url;
  }

  release(url: string) {
    for (const [blob, v] of this.urls) {
      if (v.url === url) {
        v.refs--;
        if (v.refs <= 0) {
          URL.revokeObjectURL(v.url);
          this.urls.delete(blob);
        }
        return;
      }
    }
  }

  releaseAll() {
    for (const v of this.urls.values()) URL.revokeObjectURL(v.url);
    this.urls.clear();
  }
}
