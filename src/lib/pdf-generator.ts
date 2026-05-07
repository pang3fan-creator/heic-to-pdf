// src/lib/pdf-generator.ts

import { PDFDocument } from "pdf-lib";
import {
  type ConversionSettings,
  PAGE_SIZES,
  MARGIN_VALUES,
  ORIGINAL_MAX_PT,
} from "./conversion-types";

export interface PageImage {
  pngBytes: Uint8Array;
  width: number; // original pixel width
  height: number; // original pixel height
}

export interface LayoutResult {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  drawWidth: number;
  drawHeight: number;
}

/** Calculate page dimensions and image placement based on settings. */
export function calculateLayout(
  imgWidth: number,
  imgHeight: number,
  settings: ConversionSettings,
): LayoutResult {
  if (imgWidth <= 0 || imgHeight <= 0) {
    throw new Error(`Invalid image dimensions: ${imgWidth}x${imgHeight}`);
  }
  if (settings.paperSize === "original") {
    // Map pixels to points at 72 DPI, cap long side at ORIGINAL_MAX_PT
    const maxDim = Math.max(imgWidth, imgHeight);
    const scale = maxDim > ORIGINAL_MAX_PT ? ORIGINAL_MAX_PT / maxDim : 1;
    const w = Math.min(ORIGINAL_MAX_PT, Math.round(imgWidth * scale));
    const h = Math.min(ORIGINAL_MAX_PT, Math.round(imgHeight * scale));
    return { pageWidth: w, pageHeight: h, x: 0, y: 0, drawWidth: w, drawHeight: h };
  }

  // A4 mode
  const { width: pw, height: ph } = PAGE_SIZES.a4;
  const landscape = settings.orientation === "landscape";
  const pageWidth = landscape ? ph : pw;
  const pageHeight = landscape ? pw : ph;
  const margin = MARGIN_VALUES[settings.margins];

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Fit image into content area preserving aspect ratio
  const imgAspect = imgWidth / imgHeight;
  const contentAspect = contentWidth / contentHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (imgAspect > contentAspect) {
    drawWidth = contentWidth;
    drawHeight = contentWidth / imgAspect;
  } else {
    drawHeight = contentHeight;
    drawWidth = contentHeight * imgAspect;
  }

  // Center on page
  const x = margin + (contentWidth - drawWidth) / 2;
  const y = margin + (contentHeight - drawHeight) / 2;

  return { pageWidth, pageHeight, x, y, drawWidth, drawHeight };
}

/**
 * Build PDF incrementally.
 * Accepts an array of {pngBytes, width, height} and settings.
 * Returns the final PDF as a Blob.
 */
export async function buildPdf(
  images: PageImage[],
  settings: ConversionSettings,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    let pngImage;
    try {
      pngImage = await pdfDoc.embedPng(img.pngBytes);
    } catch (err) {
      console.warn("Failed to embed image in PDF:", err);
      continue;
    }

    const layout = calculateLayout(img.width, img.height, settings);
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(pngImage, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
