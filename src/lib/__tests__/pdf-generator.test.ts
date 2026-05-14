// src/lib/__tests__/pdf-generator.test.ts

import { describe, it, expect } from "vitest";
import { buildPdf, calculateLayout } from "../pdf-generator";
import type { ConversionSettings, PdfImageInput } from "../conversion-types";
import { DEFAULT_SETTINGS, PAGE_SIZES } from "../conversion-types";

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

// 1x1 white JPEG.
function createMinimalJpeg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
    0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05,
    0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0a, 0x07,
    0x07, 0x06, 0x08, 0x0c, 0x0a, 0x0c, 0x0c, 0x0b,
    0x0a, 0x0b, 0x0b, 0x0d, 0x0e, 0x12, 0x10, 0x0d,
    0x0e, 0x11, 0x0e, 0x0b, 0x0b, 0x10, 0x16, 0x10,
    0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0c, 0x0f,
    0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15,
    0x14, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
    0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14,
    0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0x37, 0xff, 0xd9,
  ]);
}

const defaultSettings: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
  pdfQuality: "balanced",
  merge: true,
};

describe("DEFAULT_SETTINGS", () => {
  it("uses balanced PDF quality by default", () => {
    expect(DEFAULT_SETTINGS.pdfQuality).toBe("balanced");
  });

  it("keeps A4 as the default paper size", () => {
    expect(DEFAULT_SETTINGS.paperSize).toBe("a4");
  });
});

describe("PAGE_SIZES", () => {
  it("does not expose Legal as an editor paper size", () => {
    expect("legal" in PAGE_SIZES).toBe(false);
  });
});

describe("buildPdf", () => {
  it("produces a PDF blob from a single image", async () => {
    const images: PdfImageInput[] = [
      { format: "png", data: createMinimalPng(), width: 100, height: 100 },
    ];

    const blob = await buildPdf(images, defaultSettings);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a PDF blob from a JPEG image", async () => {
    const images: PdfImageInput[] = [
      { format: "jpeg", data: createMinimalJpeg(), width: 1, height: 1 },
    ];

    const blob = await buildPdf(images, defaultSettings);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a multi-page PDF from multiple images", async () => {
    const images: PdfImageInput[] = [
      { format: "png", data: createMinimalPng(), width: 100, height: 100 },
      { format: "png", data: createMinimalPng(), width: 200, height: 200 },
      { format: "png", data: createMinimalPng(), width: 300, height: 300 },
    ];

    const blob = await buildPdf(images, defaultSettings);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a PDF in original size mode", async () => {
    const images: PdfImageInput[] = [
      { format: "png", data: createMinimalPng(), width: 100, height: 100 },
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
    // A4 portrait: 595x842, margin=17
    // content: 561x808, image aspect 0.5 → contained by height: 808
    // drawWidth = 808 * 0.5 = 404, drawHeight = 808
    expect(layout.drawHeight).toBeLessThanOrEqual(842 - 34); // content height
    expect(layout.drawWidth).toBeLessThanOrEqual(595 - 34); // content width
    expect(layout.drawHeight / layout.drawWidth).toBeCloseTo(200 / 100, 1);
    expect(layout.x).toBeGreaterThanOrEqual(17); // within margins
    expect(layout.y).toBeGreaterThanOrEqual(17);
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
    expect(normalLayout.x).toBe(34);
    expect(normalLayout.drawWidth).toBeLessThan(noneLayout.drawWidth);
  });

  it("supports Letter paper size", () => {
    const layout = calculateLayout(100, 100, {
      ...defaultSettings,
      paperSize: "letter",
    });
    // Letter portrait: 612x792
    expect(layout.pageWidth).toBe(612);
    expect(layout.pageHeight).toBe(792);
  });

  it("supports A3 paper size", () => {
    const layout = calculateLayout(100, 100, {
      ...defaultSettings,
      paperSize: "a3",
    });
    // A3 portrait: 842x1191
    expect(layout.pageWidth).toBe(842);
    expect(layout.pageHeight).toBe(1191);
  });

  it("applies wide margin", () => {
    const layout = calculateLayout(100, 100, {
      ...defaultSettings,
      margins: "wide",
    });
    // wide = 68pt
    expect(layout.x).toBe(68);
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
