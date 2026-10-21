// PDF via pdfjs-dist — worker empacotado LOCALMENTE (sem CDN → funciona offline no .exe)
// e renderização LAZY por página (nada de pré-renderizar o documento inteiro).
import * as pdfjsLib from 'pdfjs-dist';
// Vite resolve este import como asset; no build final o worker fica em ./dist, 100% offline.
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;

export class PdfDocumentPool {
  private static doc: PDFDocumentProxy | null = null;

  static async load(file: File): Promise<PDFDocumentProxy> {
    await PdfDocumentPool.destroy();
    const data = await file.arrayBuffer();
    PdfDocumentPool.doc = await pdfjsLib.getDocument({ data }).promise;
    return PdfDocumentPool.doc;
  }

  static async destroy() {
    if (PdfDocumentPool.doc) {
      try {
        await PdfDocumentPool.doc.destroy();
      } catch {}
      PdfDocumentPool.doc = null;
    }
  }
}

export async function getPDFPageCount(file: File): Promise<number> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const count = doc.numPages;
  await doc.destroy();
  return count;
}
