// src/lib/heic-worker.ts

import libheif from "libheif-js/wasm-bundle";

let decoder: InstanceType<typeof libheif.HeifDecoder> | null = null;
let cancelled = false;

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
    if (cancelled) return;

    try {
      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: 10,
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
        percent: 40,
      });

      const image = images[0];
      const width = image.get_width();
      const height = image.get_height();

      if (cancelled) return;

      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: 60,
      });

      const rgbaData = new Uint8Array(width * height * 4);

      await new Promise<void>((resolve, reject) => {
        image.display(rgbaData, () => {
          resolve();
        });
      });

      if (cancelled) return;

      self.postMessage({
        type: "progress",
        fileIndex: msg.fileIndex,
        percent: 90,
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
