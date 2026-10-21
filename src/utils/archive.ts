// CBZ/ZIP via JSZip + CBR/RAR via desktop bridge (Electron)
import JSZip from 'jszip';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];

export interface ArchivePage {
  name: string;
  dataUrl: string;
}

interface DesktopBridge {
  extractRar: (bytes: Uint8Array) => Promise<Array<{ name: string; bytes: Uint8Array }>>;
}

function getDesktopBridge(): DesktopBridge | undefined {
  return (window as unknown as { nekoDesktop?: DesktopBridge }).nekoDesktop;
}

const isImage = (name: string) => IMAGE_EXTS.some(ext => name.toLowerCase().endsWith(ext));
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

export async function openCBZ(file: File): Promise<ArchivePage[]> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files)
    .filter(([name, entry]) => !entry.dir && isImage(name))
    .sort(([a], [b]) => byName(a, b));

  const pages: ArchivePage[] = [];
  for (const [name, entry] of entries) {
    const blob = await entry.async('blob');
    pages.push({ name, dataUrl: await blobToDataUrl(blob) });
  }
  return pages;
}

export async function openCBR(file: File): Promise<ArchivePage[]> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    throw new Error('Arquivos .cbr (RAR) abrem no app desktop. Gere o .exe com o criar-exe.bat ou converta o arquivo para .cbz.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = await bridge.extractRar(bytes);
  const images = entries.filter(e => isImage(e.name)).sort((a, b) => byName(a.name, b.name));

  const pages: ArchivePage[] = [];
  for (const entry of images) {
    pages.push({ name: entry.name, dataUrl: await bytesToDataUrl(entry.bytes, entry.name) });
  }
  return pages;
}

function bytesToDataUrl(bytes: Uint8Array, name: string): Promise<string> {
  const ext = name.toLowerCase().split('.').pop() || 'jpg';
  const mime =
    ext === 'png' ? 'image/png' :
    ext === 'gif' ? 'image/gif' :
    ext === 'webp' ? 'image/webp' :
    ext === 'bmp' ? 'image/bmp' :
    ext === 'avif' ? 'image/avif' : 'image/jpeg';
  return blobToDataUrl(new Blob([bytes as unknown as BlobPart], { type: mime }));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
