// src/lib/conversion-types.ts

export interface ConversionFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "converting" | "done" | "skipped";
  thumbnailUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  /** Scaled RGBA pixel data for thumbnail grid canvas rendering (300px max). */
  thumbnailData?: Uint8Array;
  thumbnailDataWidth?: number;
  thumbnailDataHeight?: number;
  /** Larger RGBA pixel data for the preview modal (800px max). */
  previewData?: Uint8Array;
  previewDataWidth?: number;
  previewDataHeight?: number;
  error?: string;
}

export interface ConversionSettings {
  paperSize: "original" | "a4" | "letter" | "legal" | "a3";
  margins: "none" | "narrow" | "normal" | "wide";
  orientation: "portrait" | "landscape" | "auto";
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
};

export type ConversionState =
  | { status: "idle" }
  | {
      status: "editor";
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
  | {
      status: "complete";
      files: ConversionFile[];
      pdfBlob: Blob;
      pdfSizeBytes: number;
    }
  | { status: "error"; files: ConversionFile[]; error: string };

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
  a4: { width: 595, height: 842, label: "A4 (210 × 297 mm)" },
  letter: { width: 612, height: 792, label: "Letter (216 × 279 mm)" },
  legal: { width: 612, height: 1008, label: "Legal (216 × 356 mm)" },
  a3: { width: 842, height: 1191, label: "A3 (297 × 420 mm)" },
} as const;

export const MARGIN_VALUES = {
  none: 0,
  narrow: 17,
  normal: 34,
  wide: 68,
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

/** Get human-readable paper size display string. */
export function getPaperSizeDisplay(key: string): string {
  if (key === "original") return "Original";
  const size = PAGE_SIZES[key as keyof typeof PAGE_SIZES];
  return size ? size.label : key;
}

/** Resolve auto orientation based on image aspect ratio. */
export function resolveOrientation(
  imgWidth: number,
  imgHeight: number,
  settings: ConversionSettings,
): "portrait" | "landscape" {
  if (settings.orientation !== "auto") return settings.orientation;
  return imgWidth > imgHeight ? "landscape" : "portrait";
}
