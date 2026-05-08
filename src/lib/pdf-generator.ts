// src/lib/pdf-generator.ts

import { PDFDocument } from "pdf-lib";
import {
  type ConversionSettings,
  type PdfImageInput,
  PAGE_SIZES,
  MARGIN_VALUES,
  ORIGINAL_MAX_PT,
} from "./conversion-types";

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

  // Standard paper size mode
  const ps = PAGE_SIZES[settings.paperSize as keyof typeof PAGE_SIZES];
  if (!ps) {
    throw new Error(`Unknown paper size: ${settings.paperSize}`);
  }
  const landscape = settings.orientation === "landscape";
  const pageWidth = landscape ? ps.height : ps.width;
  const pageHeight = landscape ? ps.width : ps.height;
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
  images: PdfImageInput[],
  settings: ConversionSettings,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    let image;
    try {
      if (img.format === "jpeg") {
        image = await pdfDoc.embedJpg(img.data);
      } else {
        image = await pdfDoc.embedPng(img.data);
      }
    } catch (err) {
      console.warn("Failed to embed image in PDF:", err);
      continue;
    }

    const layout = calculateLayout(img.width, img.height, settings);
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(image, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
