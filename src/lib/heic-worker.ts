// src/lib/heic-worker.ts — Minimal POC version
// Will be fleshed out in Phase 1.

import libheif from "libheif-js/wasm-bundle";

let decoder: InstanceType<typeof libheif.HeifDecoder> | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;

  if (msg.type === "init") {
    try {
      decoder = new libheif.HeifDecoder();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({
        type: "error",
        error: err instanceof Error ? err.message : "WASM init failed",
      });
    }
    return;
  }

  if (msg.type === "decode" && decoder) {
    try {
      const buffer = msg.buffer as ArrayBuffer;
      const images = decoder.decode(buffer);

      if (images.length === 0) {
        self.postMessage({
          type: "file-error",
          fileIndex: msg.fileIndex,
          error: "No HEIC images found in file",
        });
        return;
      }

      const image = images[0];
      const width = image.get_width();
      const height = image.get_height();

      const rgbaData = new Uint8Array(width * height * 4);
      image.display(rgbaData, () => {
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
      });
    } catch (err) {
      self.postMessage({
        type: "file-error",
        fileIndex: msg.fileIndex,
        error: err instanceof Error ? err.message : "Decode failed",
      });
    }
  }
};
