// src/hooks/useHeicConversion.ts

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ConversionFile,
  type ConversionSettings,
  type ConversionState,
  type PdfImageInput,
  MAX_FILES,
  MAX_FILE_SIZE,
  PDF_FILENAME,
  DEFAULT_SETTINGS,
  getFileType,
  resolveOrientation,
} from "@/lib/conversion-types";
import { buildPdf } from "@/lib/pdf-generator";
import { decodeImage } from "@/lib/image-decoder";
import { resolvePdfNames, createZip } from "@/lib/zip-utils";

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


export function useHeicConversion() {
  const [state, setState] = useState<ConversionState>({ status: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const filesRef = useRef<ConversionFile[]>([]);
  const settingsRef = useRef<ConversionSettings>(DEFAULT_SETTINGS);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);
  const isDecodingRef = useRef(false);
  const decodedFileIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerRef.current?.terminate();
    };
  }, []);

  // Clear decode flag when leaving editor state
  useEffect(() => {
    if (state.status !== "editor") {
      isDecodingRef.current = false;
    }
  }, [state.status]);

  const cleanupDecodeState = useCallback(() => {
    decodedFileIdsRef.current.clear();
  }, []);

  const decodePendingFiles = useCallback(async () => {
    if (isDecodingRef.current) return; // already decoding

    isDecodingRef.current = true; // flag as "decoding in progress"

    try {
      const currentFiles = filesRef.current;

      for (let i = 0; i < currentFiles.length; i++) {
        const f = currentFiles[i];
        if (f.thumbnailData || decodedFileIdsRef.current.has(f.id))
          continue;

        const format = getFileType(f.file);
        if (format === "unsupported") continue;

        let result: { width: number; height: number; rgbaBuffer: Uint8Array };
        try {
          result = await decodeImage(f.file, format);
        } catch {
          continue; // Silently skip decode failures
        }

        if (!mountedRef.current) return;

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
    } finally {
      if (isDecodingRef.current) {
        isDecodingRef.current = false;
      }
    }
  }, []);

  const selectFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const valid = incoming.filter(
      (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
    );
    const truncated = valid.slice(0, MAX_FILES);
    const files = truncated.map(createConversionFile);
    filesRef.current = files;
    const prevMerge = settingsRef.current.merge;
    const newSettings = { ...DEFAULT_SETTINGS, merge: prevMerge };
    settingsRef.current = newSettings;
    setState({
      status: "editor",
      files,
      settings: newSettings,
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
      (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
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
    isDecodingRef.current = false;
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

    try {
      const pdfImages: PdfImageInput[] = [];

      for (let i = 0; i < files.length; i++) {
        if (cancelledRef.current) break;

        setState({
          status: "converting",
          files,
          settings,
          progress: Math.round((i / files.length) * 100),
          currentFileIndex: i,
        });

        const file = files[i].file;
        const format = getFileType(file);
        if (format === "unsupported") {
          files[i] = { ...files[i], status: "skipped", error: "Unsupported format" };
          continue;
        }

        let width: number, height: number, data: Uint8Array;

        if (format === "jpeg" || format === "png") {
          // Direct embed: use original bytes + createImageBitmap for dimensions
          const [buffer, bitmap] = await Promise.all([
            file.arrayBuffer(),
            createImageBitmap(file),
          ]);
          data = new Uint8Array(buffer);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } else {
          // HEIC or WebP: decode via image-decoder → Canvas → PNG
          let rgbaResult;
          try {
            rgbaResult = await decodeImage(file, format);
          } catch (err) {
            files[i] = {
              ...files[i],
              status: "skipped",
              error: err instanceof Error ? err.message : "Decode failed",
            };
            continue;
          }

          const canvas = document.createElement("canvas");
          canvas.width = rgbaResult.width;
          canvas.height = rgbaResult.height;
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
            new Uint8ClampedArray(rgbaResult.rgbaBuffer),
            rgbaResult.width,
            rgbaResult.height,
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

          data = new Uint8Array(await pngBlob.arrayBuffer());
          width = rgbaResult.width;
          height = rgbaResult.height;
        }

        pdfImages.push({ format, data, width, height });
        files[i] = { ...files[i], status: "done" };
      }

      // Handle cancellation mid-conversion
      if (cancelledRef.current) {
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
          width: img.width,
          height: img.height,
          orientation: resolvedOrientation,
        };
      });

      const perImageSettings = imagesWithOrientation.map((img) => ({
        ...settings,
        orientation: img.orientation,
      }));

      filesRef.current = files;
      if (!mountedRef.current) return;

      let blob: Blob;
      let blobType: "pdf" | "zip";
      let downloadName: string;

      if (settings.merge || pdfImages.length <= 1) {
        // Single image or merge mode: direct PDF download
        blob = await buildPdf(pdfImages, {
          ...settings,
          orientation: perImageSettings[0]?.orientation ?? settings.orientation,
        });
        blobType = "pdf";
        downloadName = PDF_FILENAME;
      } else {
        // Non-merge mode: individual PDFs → zip
        const names = resolvePdfNames(
          pdfImages.map((_, i) => files[i]),
        );
        const pdfBlobs: { name: string; blob: Blob }[] = [];

        for (let i = 0; i < pdfImages.length; i++) {
          pdfBlobs.push({
            name: names[i],
            blob: await buildPdf([pdfImages[i]], perImageSettings[i]),
          });
        }

        blob = await createZip(pdfBlobs);
        blobType = "zip";
        downloadName = "images.zip";
      }

      if (!mountedRef.current) return;

      setState({
        status: "complete",
        files,
        blob,
        blobType,
        sizeBytes: blob.size,
      });

      // Auto-download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
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
    isDecodingRef.current = false;
    cleanupDecodeState();
    filesRef.current = [];
    setState({ status: "idle" });
  }, [cleanupDecodeState]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    workerRef.current?.postMessage({ type: "cancel" });
    workerRef.current?.terminate();
    workerRef.current = null;
    isDecodingRef.current = false;
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
