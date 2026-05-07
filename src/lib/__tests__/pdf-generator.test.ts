// src/lib/__tests__/pdf-generator.test.ts

import { describe, it, expect } from "vitest";
import { buildPdf, calculateLayout, type PageImage } from "../pdf-generator";
import type { ConversionSettings } from "../conversion-types";

// Create a minimal valid PNG for testing
// 1x1 pixel transparent PNG
function createMinimalPng(): Uint8Array {
  // Minimal valid PNG: 1x1 pixel, RGBA (fully transparent)
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG header
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // RGBA, 8-bit
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, // (compressed data)
    0x00, 0x01, 0x0a, 0x05, 0x8f, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND chunk
  ]);
  return png;
}

const defaultSettings: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
};

describe("buildPdf", () => {
  it("produces a PDF blob from a single image", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
    ];

    const blob = await buildPdf(images, defaultSettings);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a multi-page PDF from multiple images", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
      { pngBytes: createMinimalPng(), width: 200, height: 200 },
      { pngBytes: createMinimalPng(), width: 300, height: 300 },
    ];

    const blob = await buildPdf(images, defaultSettings);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a PDF in original size mode", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
    ];

    const blob = await buildPdf(images, {
      ...defaultSettings,
      paperSize: "original",
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles empty image array gracefully", async () => {
    const blob = await buildPdf([], defaultSettings);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });
});

describe("calculateLayout", () => {
  it("returns correct dimensions for original size mode", () => {
    const layout = calculateLayout(3024, 4032, {
      ...defaultSettings,
      paperSize: "original",
    });
    // 4032 > 1200, so scale down: 1200/4032 ≈ 0.2976
    expect(layout.pageWidth).toBeLessThanOrEqual(1200);
    expect(layout.pageHeight).toBeLessThanOrEqual(1200);
    expect(layout.pageWidth / layout.pageHeight).toBeCloseTo(3024 / 4032, 2);
    expect(layout.x).toBe(0);
    expect(layout.y).toBe(0);
  });

  it("centers image on A4 page with narrow margins", () => {
    const layout = calculateLayout(100, 200, defaultSettings);
    // A4 portrait: 595x842, margin=36
    // content: 523x770, image aspect 0.5 → contained by height: 770
    // drawWidth = 770 * 0.5 = 385, drawHeight = 770
    expect(layout.drawHeight).toBeLessThanOrEqual(842 - 72); // content height
    expect(layout.drawWidth).toBeLessThanOrEqual(595 - 72); // content width
    expect(layout.drawHeight / layout.drawWidth).toBeCloseTo(200 / 100, 1);
    expect(layout.x).toBeGreaterThanOrEqual(36); // within margins
    expect(layout.y).toBeGreaterThanOrEqual(36);
  });

  it("uses landscape orientation for A4", () => {
    const layout = calculateLayout(100, 200, {
      ...defaultSettings,
      orientation: "landscape",
    });
    // Landscape: 842x595
    expect(layout.pageWidth).toBe(842);
    expect(layout.pageHeight).toBe(595);
  });

  it("applies different margin values", () => {
    const noneLayout = calculateLayout(100, 100, {
      ...defaultSettings,
      margins: "none",
    });
    const normalLayout = calculateLayout(100, 100, {
      ...defaultSettings,
      margins: "normal",
    });

    expect(noneLayout.x).toBe(0);
    expect(normalLayout.x).toBe(72);
    expect(normalLayout.drawWidth).toBeLessThan(noneLayout.drawWidth);
  });

  it("throws on invalid dimensions", () => {
    expect(() =>
      calculateLayout(0, 100, defaultSettings),
    ).toThrow("Invalid image dimensions");
    expect(() =>
      calculateLayout(100, 0, defaultSettings),
    ).toThrow("Invalid image dimensions");
  });
});
