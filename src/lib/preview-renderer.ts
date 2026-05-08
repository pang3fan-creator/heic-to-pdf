// src/lib/preview-renderer.ts

"use client";

import type { ConversionSettings } from "@/lib/conversion-types";
import { resolveOrientation } from "@/lib/conversion-types";
import { calculateLayout } from "@/lib/pdf-generator";

/**
 * Draw a simulated PDF page on a canvas: white page background with the image
 * positioned according to calculateLayout().
 *
 * @param canvas  - target canvas element
 * @param img     - loaded HTMLImageElement of the decoded photo
 * @param imgWidth - original image pixel width
 * @param imgHeight - original image pixel height
 * @param settings - current conversion settings
 */
export function drawPagePreview(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  imgWidth: number,
  imgHeight: number,
  settings: ConversionSettings,
  /** Override viewport dimensions (defaults to 500×700) */
  viewport?: { width: number; height: number },
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Resolve auto orientation
  const resolvedOrientation = resolveOrientation(imgWidth, imgHeight, settings);
  const resolvedSettings: ConversionSettings = {
    ...settings,
    orientation: resolvedOrientation,
  };

  // 2. Calculate exact PDF page layout
  const layout = calculateLayout(imgWidth, imgHeight, resolvedSettings);

  // 3. Determine scale to fit within preview viewport
  const maxWidth = viewport?.width ?? 500;
  const maxHeight = viewport?.height ?? 700;
  const fitScale = Math.min(
    maxWidth / layout.pageWidth,
    maxHeight / layout.pageHeight,
    1, // never upscale
  );

  // 4. Apply device pixel ratio for sharp rendering on retina
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.round(layout.pageWidth * fitScale);
  const displayH = Math.round(layout.pageHeight * fitScale);

  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;
  canvas.style.width = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
  ctx.scale(dpr, dpr);

  // 5. Draw simulated paper page with shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, displayW, displayH);
  ctx.restore();

  // 6. Re-draw opaque white page (shadow is behind)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, displayW, displayH);

  // 7. Draw the image at the calculated position, scaled to preview size
  ctx.drawImage(
    img,
    Math.round(layout.x * fitScale),
    Math.round(layout.y * fitScale),
    Math.round(layout.drawWidth * fitScale),
    Math.round(layout.drawHeight * fitScale),
  );
}
