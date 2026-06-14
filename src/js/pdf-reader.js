/**
 * @module pdf-reader
 * Renders a PDF page to an HTMLCanvasElement so the scanner can decode it.
 * Uses pdfjs-dist; the worker URL is resolved at build time by Vite.
 */

import * as pdfjsLib from 'pdfjs-dist';
import PDFWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorkerUrl;

/**
 * Load a PDF from a File and return a pdfjsLib.PDFDocumentProxy.
 *
 * @param {File} file
 * @returns {Promise<import('pdfjs-dist').PDFDocumentProxy>}
 */
export async function loadPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

/**
 * Render one page of a PDF document onto a new canvas and return it.
 * Scale is chosen to produce ~200 dpi equivalent for reliable barcode scanning.
 *
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {number} [pageNumber=1] - 1-based page index
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPage(pdf, pageNumber = 1) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 2.5 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  return canvas;
}

/**
 * Convenience: load a PDF file and render a single page.
 *
 * @param {File} file
 * @param {number} [pageNumber=1]
 * @returns {Promise<{ canvas: HTMLCanvasElement, pageCount: number }>}
 */
export async function loadAndRenderPage(file, pageNumber = 1) {
  const pdf = await loadPDF(file);
  const canvas = await renderPage(pdf, pageNumber);
  return { canvas, pageCount: pdf.numPages };
}
