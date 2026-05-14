import {
  type ConversionSettings,
  type ImageRotation,
  type ImageFormat,
  type PdfImageInput,
  getRotatedDimensions,
  normalizeRotation,
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

function rotateCanvas(
  source: HTMLCanvasElement,
  rotation: ImageRotation,
): HTMLCanvasElement | null {
  if (rotation === 0) return source;

  const dimensions = getRotatedDimensions(source.width, source.height, rotation);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
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
  rotation: ImageRotation = 0,
): Promise<PdfImageInput> {
  const preset = PDF_QUALITY_PRESETS[settings.pdfQuality];
  const normalizedRotation = normalizeRotation(rotation);

  if (preset.jpegQuality === null) {
    if (normalizedRotation === 0 && (format === "jpeg" || format === "png")) {
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

    if (format === "jpeg" || format === "png") {
      const { canvas, width, height } = await drawFileToCanvas(file);
      const rotatedCanvas = rotateCanvas(canvas, normalizedRotation);
      if (!rotatedCanvas) throw new Error("Canvas context not available");
      const dimensions = getRotatedDimensions(width, height, normalizedRotation);
      return encodeCanvasForPdf(
        rotatedCanvas,
        dimensions.width,
        dimensions.height,
        format === "jpeg" ? "image/jpeg" : "image/png",
      );
    }

    const rgbaImage = await decodeImage(file, format);
    const canvas = drawRgbaToCanvas(rgbaImage, false);
    if (!canvas) throw new Error("Canvas context not available");
    const rotatedCanvas = rotateCanvas(canvas, normalizedRotation);
    if (!rotatedCanvas) throw new Error("Canvas context not available");
    const dimensions = getRotatedDimensions(
      rgbaImage.width,
      rgbaImage.height,
      normalizedRotation,
    );
    return encodeCanvasForPdf(
      rotatedCanvas,
      dimensions.width,
      dimensions.height,
      "image/png",
    );
  }

  if (format === "heic" || format === "webp") {
    const rgbaImage = await decodeImage(file, format);
    const canvas = drawRgbaToCanvas(rgbaImage, true);
    if (!canvas) throw new Error("Canvas context not available");
    const rotatedCanvas = rotateCanvas(canvas, normalizedRotation);
    if (!rotatedCanvas) throw new Error("Canvas context not available");
    const dimensions = getRotatedDimensions(
      rgbaImage.width,
      rgbaImage.height,
      normalizedRotation,
    );
    return encodeCanvasForPdf(
      rotatedCanvas,
      dimensions.width,
      dimensions.height,
      "image/jpeg",
      preset.jpegQuality,
    );
  }

  const { canvas, width, height } = await drawFileToCanvas(file);
  const rotatedCanvas = rotateCanvas(canvas, normalizedRotation);
  if (!rotatedCanvas) throw new Error("Canvas context not available");
  const dimensions = getRotatedDimensions(width, height, normalizedRotation);
  return encodeCanvasForPdf(
    rotatedCanvas,
    dimensions.width,
    dimensions.height,
    "image/jpeg",
    preset.jpegQuality,
  );
}
