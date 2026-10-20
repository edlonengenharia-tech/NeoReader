// CBZ/ZIP archive handling using JSZip (pure JS, no native deps)
import JSZip from 'jszip';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'];

export interface ArchivePage {
  name: string;
  dataUrl: string;
}

export async function openCBZ(file: File): Promise<ArchivePage[]> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files)
    .filter(([name, entry]) => !entry.dir && IMAGE_EXTS.some(ext => name.toLowerCase().endsWith(ext)))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  const pages: ArchivePage[] = [];
  for (const [name, entry] of entries) {
    const blob = await entry.async('blob');
    const dataUrl = await blobToDataUrl(blob);
    pages.push({ name, dataUrl });
  }
  return pages;
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

export function isPDFFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf');
}

export function isSupportedFile(file: File): boolean {
  return isArchiveFile(file) || isPDFFile(file);
}
