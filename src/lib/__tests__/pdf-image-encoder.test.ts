import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversionSettings } from "../conversion-types";

const decodeImageMock = vi.hoisted(() => vi.fn());

vi.mock("../image-decoder", () => ({
  decodeImage: decodeImageMock,
}));

import { encodeFileForPdf } from "../pdf-image-encoder";

class MockCanvas {
  width = 0;
  height = 0;
  fillStyle = "";
  operations: string[] = [];

  getContext() {
    return {
      fillStyle: "",
      fillRect: vi.fn(() => {
        this.operations.push("fillRect");
      }),
      drawImage: vi.fn(() => {
        this.operations.push("drawImage");
      }),
      putImageData: vi.fn(() => {
        this.operations.push("putImageData");
      }),
      translate: vi.fn(() => {
        this.operations.push("translate");
      }),
      rotate: vi.fn(() => {
        this.operations.push("rotate");
      }),
    };
  }

  toBlob(callback: (blob: Blob | null) => void, type: string, quality?: number) {
    toBlobCalls.push({ type, quality });
    callback(new Blob([type], { type }));
  }
}

const toBlobCalls: { type: string; quality?: number }[] = [];
const canvases: MockCanvas[] = [];

const balancedSettings: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
  pdfQuality: "balanced",
  merge: true,
};

describe("encodeFileForPdf", () => {
  beforeEach(() => {
    toBlobCalls.length = 0;
    canvases.length = 0;
    decodeImageMock.mockReset();
    vi.stubGlobal("ImageData", class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    });
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 10,
      height: 20,
      close: vi.fn(),
    })));
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") {
        const canvas = new MockCanvas();
        canvases.push(canvas);
        return canvas as unknown as HTMLCanvasElement;
      }
      return document.createElement(tagName);
    });
  });

  it("keeps JPEG bytes unchanged in lossless mode", async () => {
    const file = new File(["jpeg-bytes"], "photo.jpg", { type: "image/jpeg" });

    const result = await encodeFileForPdf(file, "jpeg", {
      ...balancedSettings,
      pdfQuality: "lossless",
    });

    expect(result.format).toBe("jpeg");
    expect(new TextDecoder().decode(result.data)).toBe("jpeg-bytes");
    expect(toBlobCalls).toHaveLength(0);
  });

  it("keeps PNG bytes unchanged in lossless mode", async () => {
    const file = new File(["png-bytes"], "photo.png", { type: "image/png" });

    const result = await encodeFileForPdf(file, "png", {
      ...balancedSettings,
      pdfQuality: "lossless",
    });

    expect(result.format).toBe("png");
    expect(new TextDecoder().decode(result.data)).toBe("png-bytes");
    expect(toBlobCalls).toHaveLength(0);
  });

  it("encodes HEIC as PNG in lossless mode", async () => {
    decodeImageMock.mockResolvedValue({
      rgbaBuffer: new Uint8Array(4),
      width: 1,
      height: 1,
    });

    const result = await encodeFileForPdf(
      new File(["heic"], "photo.heic", { type: "image/heic" }),
      "heic",
      { ...balancedSettings, pdfQuality: "lossless" },
    );

    expect(result.format).toBe("png");
    expect(toBlobCalls).toEqual([{ type: "image/png", quality: undefined }]);
  });

  it("encodes JPEG-compatible quality presets as JPEG with the selected quality", async () => {
    const result = await encodeFileForPdf(
      new File(["png"], "photo.png", { type: "image/png" }),
      "png",
      { ...balancedSettings, pdfQuality: "small" },
    );

    expect(result.format).toBe("jpeg");
    expect(toBlobCalls).toEqual([{ type: "image/jpeg", quality: 0.68 }]);
  });

  it("applies a white background before JPEG encoding decoded images", async () => {
    decodeImageMock.mockResolvedValue({
      rgbaBuffer: new Uint8Array(4),
      width: 1,
      height: 1,
    });

    const result = await encodeFileForPdf(
      new File(["webp"], "photo.webp", { type: "image/webp" }),
      "webp",
      { ...balancedSettings, pdfQuality: "high" },
    );

    expect(result.format).toBe("jpeg");
    expect(toBlobCalls).toEqual([{ type: "image/jpeg", quality: 0.92 }]);
    expect(canvases[0].operations).toEqual(["fillRect", "drawImage"]);
    expect(canvases[1].operations).toEqual(["putImageData"]);
  });

  it("swaps dimensions when encoding a 90 degree rotated image", async () => {
    const result = await encodeFileForPdf(
      new File(["png"], "photo.png", { type: "image/png" }),
      "png",
      balancedSettings,
      90,
    );

    expect(result.format).toBe("jpeg");
    expect(result.width).toBe(20);
    expect(result.height).toBe(10);
    expect(toBlobCalls).toEqual([{ type: "image/jpeg", quality: 0.82 }]);
  });
});
