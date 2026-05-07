// src/lib/conversion-types.ts

export interface ConversionFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "converting" | "done" | "skipped";
  thumbnailUrl?: string;
  error?: string;
}

export interface ConversionSettings {
  paperSize: "original" | "a4";
  margins: "none" | "narrow" | "normal";
  orientation: "portrait" | "landscape";
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
};

export type ConversionState =
  | { status: "idle" }
  | {
      status: "selected";
      files: ConversionFile[];
      settings: ConversionSettings;
    }
  | {
      status: "converting";
      files: ConversionFile[];
      settings: ConversionSettings;
      progress: number;
      currentFileIndex: number;
    }
  | { status: "error"; files: ConversionFile[]; error: string }
  | {
      status: "preview";
      files: ConversionFile[];
      pdfBlob: Blob;
      pdfSizeBytes: number;
    };

// Worker message types
export interface WorkerFileDone {
  type: "file-done";
  fileIndex: number;
  width: number;
  height: number;
  rgbaBuffer: Uint8Array;
}

export interface WorkerFileError {
  type: "file-error";
  fileIndex: number;
  error: string;
}

export type WorkerToMain =
  | { type: "ready" }
  | { type: "progress"; fileIndex: number; percent: number }
  | WorkerFileDone
  | WorkerFileError
  | { type: "all-done" };

export type MainToWorker =
  | { type: "init" }
  | { type: "decode"; fileIndex: number; buffer: ArrayBuffer }
  | { type: "cancel" };

// Page size constants (points)
export const PAGE_SIZES = {
  a4: { width: 595, height: 842 },
} as const;

export const MARGIN_VALUES = {
  none: 0,
  narrow: 36,
  normal: 72,
} as const;

export const MAX_FILES = 20;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const THUMB_MAX_WIDTH = 300;
export const ORIGINAL_MAX_PT = 1200;
export const PDF_FILENAME = "HEIC_Converted.pdf";

/** Format bytes to human-readable string. */
export function formatSize(bytes: number): string {
  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}
