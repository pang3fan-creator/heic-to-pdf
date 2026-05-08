// src/lib/image-decoder.ts

import type { ImageFormat } from "./conversion-types";

export interface DecodeResult {
  rgbaBuffer: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decode an image file to RGBA pixel data.
 * - HEIC: uses libheif Web Worker
 * - JPEG/PNG/WebP: uses browser createImageBitmap + Canvas
 */
export async function decodeImage(
  file: File,
  format: ImageFormat,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  if (format === "heic") {
    return decodeHeic(file, signal);
  }
  return decodeBrowserImage(file, signal);
}

/**
 * Decode HEIC via libheif Web Worker.
 * Creates a worker, sends the file buffer, returns RGBA data.
 */
async function decodeHeic(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const worker = new Worker(
    new URL("@/lib/heic-worker", import.meta.url),
  );

  return new Promise<DecodeResult>((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        file.arrayBuffer()
          .then((buffer) => {
            worker.postMessage({ type: "decode", fileIndex: 0, buffer }, [buffer]);
          })
          .catch((err) => {
            cleanup();
            reject(new Error(err.message || "Failed to read file"));
          });
      } else if (msg.type === "error") {
        cleanup();
        reject(new Error(msg.error || "Worker init failed"));
      } else if (msg.type === "file-done") {
        signal?.removeEventListener("abort", onAbort);
        cleanup();
        resolve({
          rgbaBuffer: msg.rgbaBuffer,
          width: msg.width,
          height: msg.height,
        });
      } else if (msg.type === "file-error") {
        signal?.removeEventListener("abort", onAbort);
        cleanup();
        reject(new Error(msg.error || "HEIC decode failed"));
      }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "init" });

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Decode JPEG/PNG/WebP using the browser's built-in image decoder.
 */
async function decodeBrowserImage(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const bitmap = await createImageBitmap(file, {
    resizeQuality: "high",
  });

  if (signal?.aborted) {
    bitmap.close();
    throw new DOMException("Aborted", "AbortError");
  }

  const { width, height } = bitmap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas context not available");
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  return {
    rgbaBuffer: new Uint8Array(imageData.data),
    width,
    height,
  };
}
