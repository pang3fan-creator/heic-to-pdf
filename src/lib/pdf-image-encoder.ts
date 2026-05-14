import {
  type ConversionSettings,
  type ImageFormat,
  type PdfImageInput,
  PDF_QUALITY_PRESETS,
} from "./conversion-types";
import { decodeImage } from "./image-decoder";

interface RgbaImage {
  rgbaBuffer: Uint8Array;
  width: number;
  height: number;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/jpeg" | "image/png",
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function drawRgbaToCanvas(
  rgbaImage: RgbaImage,
  withWhiteBackground: boolean,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = rgbaImage.width;
  canvas.height = rgbaImage.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imageData = new ImageData(
    new Uint8ClampedArray(rgbaImage.rgbaBuffer),
    rgbaImage.width,
    rgbaImage.height,
  );

  if (withWhiteBackground) {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = rgbaImage.width;
    sourceCanvas.height = rgbaImage.height;
    const sourceCtx = sourceCanvas.getContext("2d");
    if (!sourceCtx) return null;

    sourceCtx.putImageData(imageData, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rgbaImage.width, rgbaImage.height);
    ctx.drawImage(sourceCanvas, 0, 0);
    return canvas;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function drawFileToCanvas(file: File): Promise<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas context not available");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);

  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close();
  return { canvas, width, height };
}

async function encodeCanvasForPdf(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  type: "image/jpeg" | "image/png",
  quality?: number,
): Promise<PdfImageInput> {
  const blob = await canvasToBlob(canvas, type, quality);
  if (!blob) {
    throw new Error(`Failed to encode ${type === "image/jpeg" ? "JPEG" : "PNG"}`);
  }

  return {
    format: type === "image/jpeg" ? "jpeg" : "png",
    data: new Uint8Array(await blob.arrayBuffer()),
    width,
    height,
  };
}

/**
 * Prepare one input image for PDF embedding according to the selected output quality.
 */
export async function encodeFileForPdf(
  file: File,
  format: ImageFormat,
  settings: ConversionSettings,
): Promise<PdfImageInput> {
  const preset = PDF_QUALITY_PRESETS[settings.pdfQuality];

  if (preset.jpegQuality === null) {
    if (format === "jpeg" || format === "png") {
      const [buffer, bitmap] = await Promise.all([
        file.arrayBuffer(),
        createImageBitmap(file),
      ]);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      return {
        format,
        data: new Uint8Array(buffer),
        width,
        height,
      };
    }

    const rgbaImage = await decodeImage(file, format);
    const canvas = drawRgbaToCanvas(rgbaImage, false);
    if (!canvas) throw new Error("Canvas context not available");
    return encodeCanvasForPdf(canvas, rgbaImage.width, rgbaImage.height, "image/png");
  }

  if (format === "heic" || format === "webp") {
    const rgbaImage = await decodeImage(file, format);
    const canvas = drawRgbaToCanvas(rgbaImage, true);
    if (!canvas) throw new Error("Canvas context not available");
    return encodeCanvasForPdf(
      canvas,
      rgbaImage.width,
      rgbaImage.height,
      "image/jpeg",
      preset.jpegQuality,
    );
  }

  const { canvas, width, height } = await drawFileToCanvas(file);
  return encodeCanvasForPdf(canvas, width, height, "image/jpeg", preset.jpegQuality);
}
