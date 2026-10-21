// Detecção de formatos + acesso à ponte desktop (extração RAR via Electron).
// A extração de páginas agora é lazy e roda em worker (ver utils/pageProvider.ts
// e workers/archive.worker.ts) — nada de abrir todas as páginas de uma vez.

export interface DesktopBridge {
  extractRar: (bytes: Uint8Array) => Promise<Array<{ name: string; bytes: Uint8Array }>>;
}

export function getDesktopBridge(): DesktopBridge | undefined {
  return (window as unknown as { nekkoDesktop?: DesktopBridge }).nekkoDesktop;
}

export function isArchiveFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.cbz') || name.endsWith('.zip');
}

export function isCBRFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.cbr') || name.endsWith('.rar');
}

export function isPDFFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf');
}

export function isSupportedFile(file: File): boolean {
  return isArchiveFile(file) || isCBRFile(file) || isPDFFile(file);
}
