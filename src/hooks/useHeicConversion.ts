// src/hooks/useHeicConversion.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ConversionFile,
  type ConversionSettings,
  type ConversionState,
  type MainToWorker,
  THUMB_MAX_WIDTH,
  MAX_FILES,
  MAX_FILE_SIZE,
  PDF_FILENAME,
  DEFAULT_SETTINGS,
} from "@/lib/conversion-types";
import { buildPdf } from "@/lib/pdf-generator";

function createConversionFile(file: File): ConversionFile {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    file,
    name: file.name,
    size: file.size,
    status: "pending",
  };
}

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

export function useHeicConversion() {
  const [state, setState] = useState<ConversionState>({ status: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const thumbnailUrlsRef = useRef<string[]>([]);
  const filesRef = useRef<ConversionFile[]>([]);

  // Cleanup worker and object URLs on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      thumbnailUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const selectFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);

    // Filter valid HEIC files
    const valid = incoming.filter(
      (f) => isHeicFile(f) && f.size <= MAX_FILE_SIZE,
    );
    const truncated = valid.slice(0, MAX_FILES);

    const files = truncated.map(createConversionFile);
    filesRef.current = files;

    setState({
      status: "selected",
      files,
      settings: DEFAULT_SETTINGS,
    });
  }, []);

  const updateSettings = useCallback((settings: ConversionSettings) => {
    setState((prev) => {
      if (prev.status !== "selected") return prev;
      return { ...prev, settings };
    });
  }, []);

  const processNextImage = useCallback(
    async (
      worker: Worker,
      files: ConversionFile[],
      settings: ConversionSettings,
      startIndex: number,
      pdfImages: { pngBytes: Uint8Array; width: number; height: number }[],
    ): Promise<{
      pdfImages: { pngBytes: Uint8Array; width: number; height: number }[];
      completedFiles: ConversionFile[];
    }> => {
      if (startIndex >= files.length) {
        return { pdfImages, completedFiles: files };
      }

      const file = files[startIndex];

      // Update current file status to converting
      setState({
        status: "converting",
        files,
        settings,
        progress: Math.round((startIndex / files.length) * 100),
        currentFileIndex: startIndex,
      });
      file.status = "converting";

      const result = await new Promise<{
        width: number;
        height: number;
        rgbaBuffer: Uint8Array;
      } | null>((resolve) => {
        const handleMessage = (e: MessageEvent) => {
          const msg = e.data;

          if (
            msg.type === "file-done" &&
            msg.fileIndex === startIndex
          ) {
            worker.removeEventListener("message", handleMessage);
            resolve({
              width: msg.width,
              height: msg.height,
              rgbaBuffer: msg.rgbaBuffer,
            });
          } else if (
            msg.type === "file-error" &&
            msg.fileIndex === startIndex
          ) {
            worker.removeEventListener("message", handleMessage);
            file.status = "skipped";
            file.error = msg.error;
            resolve(null);
          }
        };
        worker.addEventListener("message", handleMessage);

        // Read file as ArrayBuffer
        file.file
          .arrayBuffer()
          .then((buffer) => {
            const msg: MainToWorker = {
              type: "decode",
              fileIndex: startIndex,
              buffer,
            };
            worker.postMessage(msg, [buffer]);
          })
          .catch((err) => {
            worker.removeEventListener("message", handleMessage);
            file.status = "skipped";
            file.error = err.message;
            resolve(null);
          });
      });

      if (result) {
        // Encode RGBA to PNG via Canvas (main thread)
        const canvas = document.createElement("canvas");
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext("2d")!;
        const imageData = new ImageData(
          new Uint8ClampedArray(result.rgbaBuffer),
          result.width,
          result.height,
        );
        ctx.putImageData(imageData, 0, 0);

        // Generate full-size PNG for PDF
        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png"),
        );

        if (pngBlob) {
          const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
          pdfImages.push({
            pngBytes,
            width: result.width,
            height: result.height,
          });
        }

        // Generate thumbnail for preview
        const thumbScale = Math.min(
          1,
          THUMB_MAX_WIDTH / Math.max(result.width, result.height),
        );
        const tw = Math.round(result.width * thumbScale);
        const th = Math.round(result.height * thumbScale);

        if (tw > 0 && th > 0) {
          const thumbCanvas = document.createElement("canvas");
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          const thumbCtx = thumbCanvas.getContext("2d")!;
          thumbCtx.drawImage(canvas, 0, 0, tw, th);

          const thumbBlob = await new Promise<Blob | null>((resolve) =>
            thumbCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.6),
          );

          if (thumbBlob) {
            const url = URL.createObjectURL(thumbBlob);
            thumbnailUrlsRef.current.push(url);
            file.thumbnailUrl = url;
          }
        }

        file.status = "done";
      }

      // Process next image recursively
      return processNextImage(worker, files, settings, startIndex + 1, pdfImages);
    },
    [],
  );

  const startConversion = useCallback(async () => {
    setState((prev) => {
      if (prev.status !== "selected") return prev;
      return {
        status: "converting" as const,
        files: prev.files,
        settings: prev.settings,
        progress: 0,
        currentFileIndex: 0,
      };
    });

    // Get current state snapshot
    const currentState = state as Extract<ConversionState, { status: "selected" }>;
    const files = [...filesRef.current];
    const settings = currentState.settings;

    // Start Worker
    const worker = new Worker(
      new URL("@/lib/heic-worker", import.meta.url),
    );
    workerRef.current = worker;

    try {
      // Wait for Worker ready
      await new Promise<void>((resolve, reject) => {
        worker.addEventListener("message", (e) => {
          if (e.data.type === "ready") resolve();
          if (e.data.type === "error") reject(new Error(e.data.error));
        });
        worker.postMessage({ type: "init" });
      });

      // Process images serially
      const result = await processNextImage(worker, files, settings, 0, []);

      // Build PDF from collected png bytes
      const pdfBlob = await buildPdf(result.pdfImages, settings);

      // Cleanup Worker
      worker.terminate();
      workerRef.current = null;

      setState({
        status: "preview",
        files: result.completedFiles,
        pdfBlob,
        pdfSizeBytes: pdfBlob.size,
      });
    } catch (err) {
      worker.terminate();
      workerRef.current = null;

      const errorFiles = files.map((f) => ({
        ...f,
        status: f.status === "pending" ? ("skipped" as const) : f.status,
      }));

      setState({
        status: "error",
        files: errorFiles,
        error: err instanceof Error ? err.message : "Conversion failed",
      });
    }
  }, [state, processNextImage]);

  const download = useCallback(() => {
    const currentState = state as Extract<ConversionState, { status: "preview" }>;
    const url = URL.createObjectURL(currentState.pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = PDF_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    thumbnailUrlsRef.current.forEach(URL.revokeObjectURL);
    thumbnailUrlsRef.current = [];
    filesRef.current = [];
    setState({ status: "idle" });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "cancel" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    reset();
  }, [reset]);

  return {
    state,
    selectFiles,
    updateSettings,
    startConversion,
    download,
    reset,
    cancel,
  };
}
