// PDF rendering using pdfjs-dist (browser version, no native canvas needed)
// NO native dependencies - uses browser's Canvas API!
import * as pdfjsLib from 'pdfjs-dist';

// Use the worker from CDN to avoid bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFPage {
  name: string;
  dataUrl: string;
}

const RENDER_SCALE = 2.0;

export async function openPDF(
  file: File,
  onProgress?: (percent: number) => void
): Promise<PDFPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PDFPage[] = [];
  const total = pdf.numPages;

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    // Use browser canvas (no native dependency!)
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({
      canvasContext: ctx,
      viewport,
    } as any).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    pages.push({ name: `Page ${i}`, dataUrl });

    // Free memory
    page.cleanup();

    // Report progress
    if (onProgress) {
      onProgress(Math.round((i / total) * 100));
    }

    // Yield to main thread for large PDFs
    if (i % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return pages;
}

export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const count = pdf.numPages;
  return count;
}
