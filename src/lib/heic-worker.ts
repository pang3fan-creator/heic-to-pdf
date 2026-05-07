// src/lib/heic-worker.ts

import libheif from "libheif-js/wasm-bundle";

let decoder: InstanceType<typeof libheif.HeifDecoder> | null = null;
let cancelled = false;
const DISPLAY_TIMEOUT_MS = 30_000;
const PROGRESS = { parsed: 10, decoded: 40, rendered: 60, exported: 90 } as const;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      decoder = new libheif.HeifDecoder();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({
        type: "error",
        error: err instanceof Error ? err.message : "WASM initialization failed",
      });
    }
    return;
  }

  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }

  if (msg.type === "decode" && decoder) {
    cancelled = false;
    if (cancelled) return;

    try {
      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: PROGRESS.parsed,
      });

      const buffer = msg.buffer as ArrayBuffer;
      const images = decoder.decode(buffer);

      if (cancelled) return;

      if (images.length === 0) {
        self.postMessage({
          type: "file-error",
          fileIndex: msg.fileIndex,
          error: "No HEIC images found in file",
        });
        return;
      }

      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: PROGRESS.decoded,
      });

      const image = images[0];
      const width = image.get_width();
      const height = image.get_height();

      if (cancelled) return;

      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: PROGRESS.rendered,
      });

      const rgbaData = new Uint8Array(width * height * 4);

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("display() timed out")),
          DISPLAY_TIMEOUT_MS,
        );
        image.display(rgbaData, () => {
          clearTimeout(timer);
          resolve();
        });
      });

      if (cancelled) return;

      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: PROGRESS.exported,
      });

      self.postMessage(
        {
          type: "file-done",
          fileIndex: msg.fileIndex,
          width,
          height,
          rgbaBuffer: rgbaData,
        },
        { transfer: [rgbaData.buffer] },
      );
    } catch (err) {
      self.postMessage({
        type: "file-error",
        fileIndex: msg.fileIndex,
        error: err instanceof Error ? err.message : "Decode failed",
      });
    }
  }
};
