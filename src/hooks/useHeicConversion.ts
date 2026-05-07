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
  const settingsRef = useRef<ConversionSettings>(DEFAULT_SETTINGS);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
      thumbnailUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const selectFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
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
    settingsRef.current = settings;
    setState((prev) => {
      if (prev.status !== "selected") return prev;
      return { ...prev, settings };
    });
  }, []);

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
          const handleMessage = (e: MessageEvent) => {
            const msg = e.data;
            if (msg.type === "file-done" && msg.fileIndex === i) {
              worker.removeEventListener("message", handleMessage);
              resolve({
                width: msg.width,
                height: msg.height,
                rgbaBuffer: msg.rgbaBuffer,
              });
            } else if (msg.type === "file-error" && msg.fileIndex === i) {
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
          const thumbCtx = thumbCanvas.getContext("2d");
          if (thumbCtx) {
            thumbCtx.drawImage(canvas, 0, 0, tw, th);
            const thumbBlob = await new Promise<Blob | null>((resolve) =>
              thumbCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.6),
            );
            if (thumbBlob) {
              const url = URL.createObjectURL(thumbBlob);
              thumbnailUrlsRef.current.push(url);
              files[i] = { ...files[i], thumbnailUrl: url };
            }
          }
        }

        files[i] = { ...files[i], status: "done" };
      }

      // Handle cancellation mid-conversion
      if (cancelledRef.current) {
        worker.terminate();
        workerRef.current = null;
        cancelledRef.current = false;
        return;
      }

      // Build PDF
      const pdfBlob = await buildPdf(pdfImages, settings);
      worker.terminate();
      workerRef.current = null;
      filesRef.current = files;

      if (!mountedRef.current) return;

      setState({
        status: "preview",
        files,
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

      if (mountedRef.current) {
        setState({
          status: "error",
          files: errorFiles,
          error: err instanceof Error ? err.message : "Conversion failed",
        });
      }
    }
  }, []);

  const download = useCallback(() => {
    if (state.status !== "preview") return;
    const url = URL.createObjectURL(state.pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = PDF_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    thumbnailUrlsRef.current.forEach(URL.revokeObjectURL);
    thumbnailUrlsRef.current = [];
    filesRef.current = [];
    setState({ status: "idle" });
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.postMessage({ type: "cancel" });
    workerRef.current?.terminate();
    workerRef.current = null;
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
