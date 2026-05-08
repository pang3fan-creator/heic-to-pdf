// src/hooks/useHeicConversion.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ConversionFile,
  type ConversionSettings,
  type ConversionState,
  type MainToWorker,
  MAX_FILES,
  MAX_FILE_SIZE,
  PDF_FILENAME,
  DEFAULT_SETTINGS,
  resolveOrientation,
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
  const filesRef = useRef<ConversionFile[]>([]);
  const settingsRef = useRef<ConversionSettings>(DEFAULT_SETTINGS);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const decodeWorkerRef = useRef<Worker | null>(null);
  const decodedFileIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
      decodeWorkerRef.current?.terminate();
    };
  }, []);

  // Terminate decode worker when leaving editor state
  useEffect(() => {
    if (state.status !== "editor") {
      decodeWorkerRef.current?.terminate();
      decodeWorkerRef.current = null;
    }
  }, [state.status]);

  const cleanupDecodeState = useCallback(() => {
    decodedFileIdsRef.current.clear();
  }, []);

  const decodePendingFiles = useCallback(async () => {
    if (decodeWorkerRef.current) return; // already decoding
    if (typeof Worker === "undefined") return; // SSR / test environment

    const worker = new Worker(
      new URL("@/lib/heic-worker", import.meta.url),
    );
    decodeWorkerRef.current = worker;

    try {
      // Wait for Worker ready
      await new Promise<void>((resolve, reject) => {
        worker.addEventListener("message", (e) => {
          if (e.data.type === "ready") resolve();
          if (e.data.type === "error")
            reject(new Error(e.data.error));
        });
        worker.postMessage({ type: "init" });
      });

      if (!mountedRef.current) {
        worker.terminate();
        return;
      }

      const currentFiles = filesRef.current;

      for (let i = 0; i < currentFiles.length; i++) {
        const f = currentFiles[i];
        if (
          f.thumbnailData ||
          decodedFileIdsRef.current.has(f.id)
        )
          continue;

        const buffer = await f.file.arrayBuffer();
        const result = await new Promise<{
          width: number;
          height: number;
          rgbaBuffer: Uint8Array;
        } | null>((resolve) => {
          const handleMsg = (e: MessageEvent) => {
            const msg = e.data;
            if (msg.type === "file-done" && msg.fileIndex === i) {
              worker.removeEventListener("message", handleMsg);
              resolve({
                width: msg.width,
                height: msg.height,
                rgbaBuffer: msg.rgbaBuffer,
              });
            } else if (
              msg.type === "file-error" &&
              msg.fileIndex === i
            ) {
              worker.removeEventListener("message", handleMsg);
              resolve(null);
            }
          };
          worker.addEventListener("message", handleMsg);
          worker.postMessage({ type: "decode", fileIndex: i, buffer }, [
            buffer,
          ]);
        });

        if (!mountedRef.current) return;
        if (!result) continue;

        // Helper: scale a canvas and read back RGBA
        const scaleRgba = (
          src: HTMLCanvasElement,
          maxDim: number,
        ): { data: Uint8Array; w: number; h: number } | null => {
          const s = Math.min(1, maxDim / Math.max(result.width, result.height));
          const w = Math.round(result.width * s);
          const h = Math.round(result.height * s);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(src, 0, 0, w, h);
          const id = ctx.getImageData(0, 0, w, h);
          return { data: new Uint8Array(id.data), w, h };
        };

        // Full-res canvas once, reuse for both sizes
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = result.width;
        srcCanvas.height = result.height;
        const srcCtx = srcCanvas.getContext("2d");
        if (srcCtx) {
          const srcImageData = new ImageData(
            new Uint8ClampedArray(result.rgbaBuffer),
            result.width,
            result.height,
          );
          srcCtx.putImageData(srcImageData, 0, 0);
        }

        const thumb = srcCtx ? scaleRgba(srcCanvas, 300) : null;
        const preview = srcCtx ? scaleRgba(srcCanvas, 800) : null;

        decodedFileIdsRef.current.add(currentFiles[i].id);

        setState((prev) => {
          if (prev.status !== "editor") return prev;
          const newFiles = [...prev.files];
          if (newFiles[i]) {
            newFiles[i] = {
              ...newFiles[i],
              imageWidth: result.width,
              imageHeight: result.height,
              thumbnailData: thumb?.data,
              thumbnailDataWidth: thumb?.w,
              thumbnailDataHeight: thumb?.h,
              previewData: preview?.data,
              previewDataWidth: preview?.w,
              previewDataHeight: preview?.h,
            };
          }
          return { ...prev, files: newFiles };
        });
      }
    } catch {
      // Silently ignore decode errors — thumbnails will show placeholder
    } finally {
      worker.terminate();
      if (decodeWorkerRef.current === worker) {
        decodeWorkerRef.current = null;
      }
    }
  }, []);

  const selectFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid = incoming.filter(
      (f) => isHeicFile(f) && f.size <= MAX_FILE_SIZE,
    );
    const truncated = valid.slice(0, MAX_FILES);
    const files = truncated.map(createConversionFile);
    filesRef.current = files;
    settingsRef.current = DEFAULT_SETTINGS;
    setState({
      status: "editor",
      files,
      settings: DEFAULT_SETTINGS,
    });
    // Start background decode after state update
    setTimeout(() => decodePendingFiles(), 0);
  }, [decodePendingFiles]);

  const updateSettings = useCallback((settings: ConversionSettings) => {
    settingsRef.current = settings;
    setState((prev) => {
      if (prev.status !== "editor") return prev;
      return { ...prev, settings };
    });
  }, []);

  const addMoreFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid = incoming.filter(
      (f) => isHeicFile(f) && f.size <= MAX_FILE_SIZE,
    );
    setState((prev) => {
      if (prev.status !== "editor") return prev;
      const remaining = MAX_FILES - prev.files.length;
      const toAdd = valid.slice(0, remaining).map(createConversionFile);
      if (toAdd.length === 0) return prev;
      const files = [...prev.files, ...toAdd];
      filesRef.current = files;
      return { ...prev, files };
    });
    // Start background decode for any new files
    setTimeout(() => decodePendingFiles(), 0);
  }, [decodePendingFiles]);

  const removeFile = useCallback((fileId: string) => {
    setState((prev) => {
      if (prev.status !== "editor") return prev;
      const files = prev.files.filter((f) => f.id !== fileId);
      if (files.length === 0) {
        filesRef.current = [];
        return { status: "idle" };
      }
      filesRef.current = files;
      return { ...prev, files };
    });
  }, []);

  const closeEditor = useCallback(() => {
    cancelledRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    decodeWorkerRef.current?.terminate();
    decodeWorkerRef.current = null;
    cleanupDecodeState();
    filesRef.current = [];
    setState({ status: "idle" });
  }, [cleanupDecodeState]);

  const startConversion = useCallback(async () => {
    const files = filesRef.current.map((f) => ({ ...f }));
    const settings = settingsRef.current;

    if (files.length === 0) return;

    cancelledRef.current = false;

    setState({
      status: "converting",
      files,
      settings,
      progress: 0,
      currentFileIndex: 0,
    });

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

      const pdfImages: {
        pngBytes: Uint8Array;
        width: number;
        height: number;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        if (cancelledRef.current) break;

        setState({
          status: "converting",
          files,
          settings,
          progress: Math.round((i / files.length) * 100),
          currentFileIndex: i,
        });

        // Decode via Worker
        const result = await new Promise<{
          width: number;
          height: number;
          rgbaBuffer: Uint8Array;
        } | null>((resolve) => {
          const decodeTimer = setTimeout(() => {
            worker.removeEventListener("message", handleMessage);
            files[i] = {
              ...files[i],
              status: "skipped",
              error: "Decode timed out",
            };
            resolve(null);
          }, 60_000);

          const handleMessage = (e: MessageEvent) => {
            const msg = e.data;
            if (msg.type === "file-done" && msg.fileIndex === i) {
              clearTimeout(decodeTimer);
              worker.removeEventListener("message", handleMessage);
              resolve({
                width: msg.width,
                height: msg.height,
                rgbaBuffer: msg.rgbaBuffer,
              });
            } else if (msg.type === "file-error" && msg.fileIndex === i) {
              clearTimeout(decodeTimer);
              worker.removeEventListener("message", handleMessage);
              files[i] = { ...files[i], status: "skipped", error: msg.error };
              resolve(null);
            }
          };
          worker.addEventListener("message", handleMessage);

          files[i].file
            .arrayBuffer()
            .then((buffer) => {
              const msg: MainToWorker = {
                type: "decode",
                fileIndex: i,
                buffer,
              };
              worker.postMessage(msg, [buffer]);
            })
            .catch((err) => {
              clearTimeout(decodeTimer);
              worker.removeEventListener("message", handleMessage);
              files[i] = {
                ...files[i],
                status: "skipped",
                error: err.message,
              };
              resolve(null);
            });
        });

        if (cancelledRef.current) break;

        if (!result) continue;

        // Encode RGBA to PNG via Canvas
        const canvas = document.createElement("canvas");
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          files[i] = {
            ...files[i],
            status: "skipped",
            error: "Canvas context not available",
          };
          continue;
        }
        const imageData = new ImageData(
          new Uint8ClampedArray(result.rgbaBuffer),
          result.width,
          result.height,
        );
        ctx.putImageData(imageData, 0, 0);

        const pngBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png"),
        );

        if (!pngBlob) {
          files[i] = {
            ...files[i],
            status: "skipped",
            error: "Failed to encode PNG",
          };
          continue;
        }

        const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
        pdfImages.push({
          pngBytes,
          width: result.width,
          height: result.height,
        });

        files[i] = { ...files[i], status: "done" };
      }

      // Handle cancellation mid-conversion
      if (cancelledRef.current) {
        worker.terminate();
        workerRef.current = null;
        cancelledRef.current = false;
        return;
      }

      // Build PDF — resolve auto orientation per image
      const imagesWithOrientation = pdfImages.map((img) => {
        const resolvedOrientation = resolveOrientation(
          img.width,
          img.height,
          settings,
        );
        return {
          pngBytes: img.pngBytes,
          width: img.width,
          height: img.height,
          orientation: resolvedOrientation,
        };
      });

      const perImageSettings = imagesWithOrientation.map((img) => ({
        ...settings,
        orientation: img.orientation,
      }));

      // Use the first image's resolved settings for buildPdf (single orientation mode)
      const pdfBlob = await buildPdf(pdfImages, {
        ...settings,
        orientation: perImageSettings[0]?.orientation ?? settings.orientation,
      });

      worker.terminate();
      workerRef.current = null;
      filesRef.current = files;

      if (!mountedRef.current) return;

      setState({
        status: "complete",
        files,
        pdfBlob,
        pdfSizeBytes: pdfBlob.size,
      });

      // Auto-download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = PDF_FILENAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Reset to idle after brief delay to show completion state
      setTimeout(() => {
        if (mountedRef.current) {
          filesRef.current = [];
          setState({ status: "idle" });
        }
      }, 1500);
    } catch (err) {
      worker.terminate();
      workerRef.current = null;

      const errorFiles = files.map((f) => ({
        ...f,
        status: f.status === "pending" ? ("skipped" as const) : f.status,
      }));

      if (mountedRef.current) {
        setState({
          status: "error",
          files: errorFiles,
          error: err instanceof Error ? err.message : "Conversion failed",
        });
      }
    }
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    decodeWorkerRef.current?.terminate();
    decodeWorkerRef.current = null;
    cleanupDecodeState();
    filesRef.current = [];
    setState({ status: "idle" });
  }, [cleanupDecodeState]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.postMessage({ type: "cancel" });
    workerRef.current?.terminate();
    workerRef.current = null;
    decodeWorkerRef.current?.terminate();
    decodeWorkerRef.current = null;
    cleanupDecodeState();
    filesRef.current = [];
    setState({ status: "idle" });
  }, [cleanupDecodeState]);

  return {
    state,
    selectFiles,
    updateSettings,
    addMoreFiles,
    removeFile,
    closeEditor,
    startConversion,
    reset,
    cancel,
  };
}
