# HEIC to PDF Conversion Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated conversion animation in DropZone with a real browser-based HEIC→PDF pipeline using Web Worker WASM decoding + pdf-lib PDF generation.

**Architecture:** HEIC files are decoded via libheif WASM in a Web Worker, raw RGBA data is transferred to the main thread for Canvas-based PNG encoding and thumbnail generation, then pdf-lib incrementally builds the PDF. A ConversionContainer orchestrates file selection, conversion settings, progress display, multi-page preview, and download.

**Tech Stack:** Next.js 15 (App Router), libheif-js/wasm-bundle, pdf-lib, Vitest

---

### Phase 0: Dependency Installation + POC Validation

#### Task 0.1: Install dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install npm packages**

```bash
npm install libheif-js pdf-lib
npm install -D vitest @types/node
```

Expected output: added N packages, no errors.

- [ ] **Step 2: Add test script to package.json**

Read `package.json`, find the `"scripts"` section, and add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: install libheif-js, pdf-lib, and vitest"
```

#### Task 0.2: Configure Webpack for WASM + Vitest

**Files:**
- Modify: `next.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Update next.config.ts to enable asyncWebAssembly**

Edit `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] **Step 3: Create setup file for vitest**

```typescript
// src/lib/__tests__/setup.ts
// Empty setup file for vitest
```

- [ ] **Step 4: Create test directory**

```bash
mkdir -p src/lib/__tests__
mkdir -p src/hooks/__tests__
```

- [ ] **Step 5: Verify vitest can run**

```bash
npx vitest run
```

Expected output: `No test files found` (this is fine — no tests written yet).

- [ ] **Step 6: Commit**

```bash
git add next.config.ts vitest.config.ts src/lib/__tests__/setup.ts src/lib/__tests__ src/hooks/__tests__
git commit -m "chore: configure webpack wasm and vitest"
```

#### Task 0.3: Minimal Worker POC — verify WASM loads in Worker

**Files:**
- Create: `src/lib/heic-worker.ts` (minimal version)

- [ ] **Step 1: Create minimal heic-worker.ts**

```typescript
// src/lib/heic-worker.ts — Minimal POC version
// Will be fleshed out in Phase 1.

import libheif from "libheif-js/wasm-bundle";

let decoder: libheif.HeifDecoder | null = null;

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
```

- [ ] **Step 2: Create a POC test page that uses this worker**

No file needed — just verify via build:

```bash
npm run build
```

Expected: Build succeeds with no errors related to Worker or WASM.

If build fails with a WASM-related error, check:
1. The `asyncWebAssembly: true` is set in next.config.ts
2. The Worker import path is correct

- [ ] **Step 3: Commit**

```bash
git add src/lib/heic-worker.ts
git commit -m "feat: add minimal heic worker poc"
```

---

### Phase 1: Core Conversion Pipeline

#### Task 1.1: Create shared types

**Files:**
- Create: `src/lib/conversion-types.ts`

- [ ] **Step 1: Create the types file**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/conversion-types.ts
git commit -m "feat: add conversion types and constants"
```

#### Task 1.2: Write the full heic-worker.ts

**Files:**
- Modify: `src/lib/heic-worker.ts` (from POC version to full version with progress reporting and cancellation)

- [ ] **Step 1: Write the full heic-worker.ts**

```typescript
// src/lib/heic-worker.ts

import libheif from "libheif-js/wasm-bundle";

let decoder: libheif.HeifDecoder | null = null;
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
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/heic-worker.ts
git commit -m "feat: add progress reporting and cancellation to heic worker"
```

#### Task 1.3: Create pdf-generator.ts

**Files:**
- Create: `src/lib/pdf-generator.ts`

- [ ] **Step 1: Write the pdf-generator.ts**

```typescript
// src/lib/pdf-generator.ts

import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import {
  type ConversionSettings,
  PAGE_SIZES,
  MARGIN_VALUES,
  ORIGINAL_MAX_PT,
} from "./conversion-types";

export interface PageImage {
  pngBytes: Uint8Array;
  width: number; // original pixel width
  height: number; // original pixel height
}

/** Calculate page dimensions and image placement based on settings. */
function calculateLayout(
  imgWidth: number,
  imgHeight: number,
  settings: ConversionSettings,
): { pageWidth: number; pageHeight: number; x: number; y: number; drawWidth: number; drawHeight: number } {
  if (settings.paperSize === "original") {
    // Map pixels to points at 72 DPI, cap long side at ORIGINAL_MAX_PT
    const maxDim = Math.max(imgWidth, imgHeight);
    const scale = maxDim > ORIGINAL_MAX_PT ? ORIGINAL_MAX_PT / maxDim : 1;
    const w = Math.round(imgWidth * scale);
    const h = Math.round(imgHeight * scale);
    return { pageWidth: w, pageHeight: h, x: 0, y: 0, drawWidth: w, drawHeight: h };
  }

  // A4 mode
  const { width: pw, height: ph } = PAGE_SIZES.a4;
  const landscape = settings.orientation === "landscape";
  const pageWidth = landscape ? ph : pw;
  const pageHeight = landscape ? pw : ph;
  const margin = MARGIN_VALUES[settings.margins];

  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Fit image into content area preserving aspect ratio
  const imgAspect = imgWidth / imgHeight;
  const contentAspect = contentWidth / contentHeight;

  let drawWidth: number;
  let drawHeight: number;

  if (imgAspect > contentAspect) {
    drawWidth = contentWidth;
    drawHeight = contentWidth / imgAspect;
  } else {
    drawHeight = contentHeight;
    drawWidth = contentHeight * imgAspect;
  }

  // Center on page
  const x = margin + (contentWidth - drawWidth) / 2;
  const y = margin + (contentHeight - drawHeight) / 2;

  return { pageWidth, pageHeight, x, y, drawWidth, drawHeight };
}

/**
 * Build PDF incrementally.
 * Accepts an array of {pngBytes, width, height} and settings.
 * Returns the final PDF as a Blob.
 */
export async function buildPdf(
  images: PageImage[],
  settings: ConversionSettings,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    let pngImage;
    try {
      pngImage = await pdfDoc.embedPng(img.pngBytes);
    } catch {
      // Skip images that fail to embed
      continue;
    }

    const layout = calculateLayout(img.width, img.height, settings);
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(pngImage, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "feat: add pdf generator with a4 and original layout"
```

#### Task 1.4: Create useHeicConversion Hook

**Files:**
- Create: `src/hooks/useHeicConversion.ts`

- [ ] **Step 1: Write the hook**

```typescript
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
        // Encode RGBA → PNG via Canvas (main thread)
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
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHeicConversion.ts
git commit -m "feat: add useHeicConversion hook with worker lifecycle"
```

---

### Phase 2: Settings + Preview UI

#### Task 2.1: Create ConversionSettings component

**Files:**
- Create: `src/components/ConversionSettings.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/ConversionSettings.tsx

"use client";

import { useTranslations } from "next-intl";
import {
  type ConversionSettings as Settings,
} from "@/lib/conversion-types";

interface Props {
  value: Settings;
  onChange: (s: Settings) => void;
}

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
              color: "var(--fg)",
            }}
          >
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: "var(--accent)" }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ConversionSettings({ value, onChange }: Props) {
  const t = useTranslations("converter.settings");

  return (
    <div
      style={{
        marginTop: 24,
        padding: 24,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        textAlign: "left",
      }}
    >
      <RadioGroup
        label={t("paperSize.label")}
        options={[
          { value: "original" as const, label: t("paperSize.original") },
          { value: "a4" as const, label: t("paperSize.a4") },
        ]}
        value={value.paperSize}
        onChange={(v) => onChange({ ...value, paperSize: v })}
      />

      <RadioGroup
        label={t("margins.label")}
        options={[
          { value: "none" as const, label: t("margins.none") },
          { value: "narrow" as const, label: t("margins.narrow") },
          { value: "normal" as const, label: t("margins.normal") },
        ]}
        value={value.margins}
        onChange={(v) => onChange({ ...value, margins: v })}
      />

      <RadioGroup
        label={t("orientation.label")}
        options={[
          { value: "portrait" as const, label: t("orientation.portrait") },
          { value: "landscape" as const, label: t("orientation.landscape") },
        ]}
        value={value.orientation}
        onChange={(v) => onChange({ ...value, orientation: v })}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConversionSettings.tsx
git commit -m "feat: add conversion settings component"
```

#### Task 2.2: Create PreviewDialog component

**Files:**
- Create: `src/components/PreviewDialog.tsx`

- [ ] **Step 1: Write the PreviewDialog**

```tsx
// src/components/PreviewDialog.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ConversionFile } from "@/lib/conversion-types";

interface Props {
  files: ConversionFile[];
  pdfBlob: Blob;
  pdfSizeBytes: number;
  skippedCount: number;
  onDownload: () => void;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function PreviewDialog({
  files,
  pdfBlob,
  pdfSizeBytes,
  skippedCount,
  onDownload,
  onReset,
}: Props) {
  const t = useTranslations("converter.preview");
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = files.length;
  const current = files[pageIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "oklch(0 0 0 / 50%)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 32,
          maxWidth: 520,
          width: "90vw",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 20,
          }}
        >
          {t("title")}
        </div>

        {/* Thumbnail viewer */}
        <div
          style={{
            background: "var(--bg)",
            borderRadius: "var(--radius-sm)",
            padding: 16,
            marginBottom: 16,
            minHeight: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {current?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.thumbnailUrl}
              alt={`Page ${pageIndex + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: 280,
                borderRadius: 4,
                objectFit: "contain",
              }}
            />
          ) : (
            <span style={{ color: "var(--muted)", fontSize: 14 }}>
              No preview available
            </span>
          )}
        </div>

        {/* Page navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={pageIndex === 0}
            style={{
              background: "var(--border)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: pageIndex === 0 ? "default" : "pointer",
              color: pageIndex === 0 ? "var(--muted)" : "var(--fg)",
              fontSize: 14,
              opacity: pageIndex === 0 ? 0.4 : 1,
            }}
          >
            ◀
          </button>
          <span style={{ fontSize: 14, color: "var(--muted)" }}>
            {t("pageOf", { current: pageIndex + 1, total: totalPages })}
          </span>
          <button
            type="button"
            onClick={() =>
              setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
            }
            disabled={pageIndex >= totalPages - 1}
            style={{
              background: "var(--border)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: pageIndex >= totalPages - 1 ? "default" : "pointer",
              color: pageIndex >= totalPages - 1 ? "var(--muted)" : "var(--fg)",
              fontSize: 14,
              opacity: pageIndex >= totalPages - 1 ? 0.4 : 1,
            }}
          >
            ▶
          </button>
        </div>

        {/* Summary */}
        <div
          style={{
            fontSize: 14,
            color: "var(--fg)",
            marginBottom: 8,
          }}
        >
          ✅ {t("summary", {
            files: files.length,
            pages: totalPages,
            size: formatBytes(pdfSizeBytes),
          })}
        </div>

        {skippedCount > 0 && (
          <div
            style={{
              fontSize: 13,
              color: "var(--accent)",
              marginBottom: 8,
            }}
          >
            ⚠️ {t("skipped", { count: skippedCount })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={onDownload}
            className="browse-btn"
            style={{ minWidth: 140 }}
          >
            {t("download")}
          </button>
          <button
            type="button"
            onClick={onReset}
            style={{
              padding: "10px 28px",
              borderRadius: 100,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: "transparent",
              color: "var(--fg)",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            {t("convertMore")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PreviewDialog.tsx
git commit -m "feat: add preview dialog with page navigation"
```

#### Task 2.3: Create ConversionContainer orchestrator

**Files:**
- Create: `src/components/ConversionContainer.tsx`
- Modify: `src/components/DropZone.tsx` — add `onFilesSelected` prop
- Modify: `src/components/HeroSection.tsx` — accept children
- Modify: `src/app/[locale]/page.tsx` — use ConversionContainer

- [ ] **Step 1: Update DropZone.tsx to accept onFilesSelected prop**

Replace the entire DropZone.tsx content. The component no longer manages its own state — it delegates to ConversionContainer via props.

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { MAX_FILES, MAX_FILE_SIZE } from "@/lib/conversion-types";

interface Props {
  onFilesSelected: (files: FileList | File[]) => void;
  isActive: boolean;
}

function isHeicFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}

export default function DropZone({ onFilesSelected, isActive }: Props) {
  const t = useTranslations("hero.dropzone");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      const filtered = Array.from(files).filter(
        (f) => isHeicFile(f.name) && f.size <= MAX_FILE_SIZE,
      );
      if (filtered.length > 0) {
        onFilesSelected(filtered);
      }
    },
    [onFilesSelected],
  );

  const onBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  // Only show drop zone when idle
  if (!isActive) return null;

  return (
    <div
      className="drop-zone"
      id="dropZone"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("dragover");
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      <div className="drop-zone-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="4" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M24 16V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 24L24 16L32 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="12" y1="37" x2="36" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h2>{t("title")}</h2>
      <p>{t("subtitle")}</p>
      <div className="hint">{t("hint")}</div>
      <button className="browse-btn" onClick={onBrowse} type="button">
        {t("browseBtn")}
      </button>
      <div className="privacy-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {t("privacy")}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".heic,.HEIC,.heif,.HEIF"
        multiple
        style={{ display: "none" }}
        onChange={onInputChange}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update HeroSection to accept children**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

export default function HeroSection({ children }: Props) {
  const t = useTranslations("hero");

  return (
    <section className="hero section" id="converter">
      <div className="container">
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
        {children}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create ConversionContainer.tsx**

```tsx
// src/components/ConversionContainer.tsx

"use client";

import { useTranslations } from "next-intl";
import { useHeicConversion } from "@/hooks/useHeicConversion";
import DropZone from "./DropZone";
import ConversionSettings from "./ConversionSettings";
import PreviewDialog from "./PreviewDialog";
import { formatSize } from "@/lib/conversion-types";

export default function ConversionContainer() {
  const t = useTranslations("converter");
  const conversion = useHeicConversion();
  const s = conversion.state;

  return (
    <>
      <DropZone
        onFilesSelected={conversion.selectFiles}
        isActive={s.status === "idle"}
      />

      {s.status === "selected" && (
        <div className="container" style={{ maxWidth: 680, marginTop: 20 }}>
          {/* File list */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            {s.files.slice(0, 5).map((f) => (
              <span key={f.id} className="file-chip">
                <span className="file-ext">HEIC</span>{" "}
                {f.name.replace(/\.(heic|heif|HEIC|HEIF)$/, "")}{" "}
                <span className="file-size">{formatSize(f.size)}</span>
              </span>
            ))}
            {s.files.length > 5 && (
              <span className="file-chip">
                <span style={{ color: "var(--muted)", fontSize: 11 }}>
                  +{s.files.length - 5} more
                </span>
              </span>
            )}
          </div>

          <ConversionSettings
            value={s.settings}
            onChange={conversion.updateSettings}
          />

          <button
            type="button"
            onClick={conversion.startConversion}
            className="browse-btn"
            style={{ marginTop: 20 }}
          >
            {t("button.convert", { count: s.files.length })}
          </button>
        </div>
      )}

      {s.status === "converting" && (
        <div className="container" style={{ maxWidth: 680, marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 10,
              justifyContent: "center",
            }}
          >
            {s.files.map((f) => (
              <span key={f.id} className="file-chip">
                <span style={{ marginRight: 4 }}>
                  {f.status === "done" ? "✅" : f.status === "skipped" ? "❌" : "⏳"}
                </span>
                {f.name.replace(/\.(heic|heif|HEIC|HEIF)$/, "")}
              </span>
            ))}
          </div>
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${s.progress}%` }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            {t("progress.fileOfTotal", {
              current: s.currentFileIndex + 1,
              total: s.files.length,
            })}
          </div>
          <button
            type="button"
            onClick={conversion.cancel}
            style={{
              marginTop: 12,
              padding: "6px 20px",
              borderRadius: 100,
              border: "1px solid var(--border)",
              cursor: "pointer",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            {t("button.cancel")}
          </button>
        </div>
      )}

      {s.status === "error" && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            color: "#e74c3c",
            textAlign: "center",
          }}
        >
          {s.error}
          <br />
          <button
            type="button"
            onClick={conversion.reset}
            className="browse-btn"
            style={{ marginTop: 12 }}
          >
            Try again
          </button>
        </div>
      )}

      {s.status === "preview" && (
        <PreviewDialog
          files={s.files.filter((f) => f.status === "done")}
          pdfBlob={s.pdfBlob}
          pdfSizeBytes={s.pdfSizeBytes}
          skippedCount={s.files.filter((f) => f.status === "skipped").length}
          onDownload={conversion.download}
          onReset={conversion.reset}
        />
      )}
    </>
  );
}
```

- [ ] **Step 4: Update page.tsx to use ConversionContainer**

```tsx
import Navbar from "@/components/Navbar";
import ConversionContainer from "@/components/ConversionContainer";
import HeroSection from "@/components/HeroSection";
import HowToSection from "@/components/HowToSection";
import AboutSection from "@/components/AboutSection";
import FaqSection from "@/components/FaqSection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection>
          <ConversionContainer />
        </HeroSection>
        <HowToSection />
        <AboutSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ConversionContainer.tsx src/components/DropZone.tsx src/components/HeroSection.tsx src/app/[locale]/page.tsx
git commit -m "feat: integrate conversion container with real pipeline"
```

#### Task 2.4: Add i18n messages for converter

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add converter keys to en.json**

Add the following block at the end, before the closing `}`:

```json
  "converter": {
    "settings": {
      "paperSize": {
        "label": "Paper Size",
        "original": "Original",
        "a4": "A4"
      },
      "margins": {
        "label": "Margins",
        "none": "None",
        "narrow": "Narrow",
        "normal": "Normal"
      },
      "orientation": {
        "label": "Orientation",
        "portrait": "Portrait",
        "landscape": "Landscape"
      }
    },
    "button": {
      "convert": "Convert {count} files →",
      "cancel": "Cancel"
    },
    "progress": {
      "fileOfTotal": "Photo {current} of {total}"
    },
    "preview": {
      "title": "PDF Preview",
      "pageOf": "Page {current} of {total}",
      "summary": "{files} files converted · {pages} pages · {size}",
      "skipped": "{count} file skipped (unsupported format)",
      "download": "Download PDF",
      "convertMore": "Convert more"
    }
  }
```

Make sure there's a comma after the previous section (`"footer"`).

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat: add converter i18n messages"
```

---

### Phase 3: Testing

#### Task 3.1: Write pdf-generator tests

**Files:**
- Create: `src/lib/__tests__/pdf-generator.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/lib/__tests__/pdf-generator.test.ts

import { describe, it, expect } from "vitest";
import { buildPdf, type PageImage } from "../pdf-generator";
import type { ConversionSettings } from "../conversion-types";

// Create a minimal valid PNG for testing
// 1x1 pixel transparent PNG
function createMinimalPng(): Uint8Array {
  // Minimal valid PNG: 1x1 pixel, RGBA (fully transparent)
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG header
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, // RGBA, 8-bit
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02, // (compressed data)
    0x00, 0x01, 0x0a, 0x05, 0x8f, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82, // IEND chunk
  ]);
  return png;
}

const defaultSettings: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
};

describe("buildPdf", () => {
  it("produces a PDF blob from a single image", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
    ];

    const blob = await buildPdf(images, defaultSettings);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a multi-page PDF from multiple images", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
      { pngBytes: createMinimalPng(), width: 200, height: 200 },
      { pngBytes: createMinimalPng(), width: 300, height: 300 },
    ];

    const blob = await buildPdf(images, defaultSettings);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("produces a PDF in original size mode", async () => {
    const images: PageImage[] = [
      { pngBytes: createMinimalPng(), width: 100, height: 100 },
    ];

    const blob = await buildPdf(images, {
      ...defaultSettings,
      paperSize: "original",
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("handles empty image array gracefully", async () => {
    const blob = await buildPdf([], defaultSettings);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test
```

Expected:
```
 ✓ src/lib/__tests__/pdf-generator.test.ts (4 tests)
 PASS
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/pdf-generator.test.ts
git commit -m "test: add pdf-generator unit tests"
```

#### Task 3.2: Write useHeicConversion tests

**Files:**
- Create: `src/hooks/__tests__/useHeicConversion.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// src/hooks/__tests__/useHeicConversion.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHeicConversion } from "../useHeicConversion";

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  private handlers: Map<string, (e: MessageEvent) => void> = new Map();

  constructor(_url: URL) {}

  postMessage(msg: unknown, _transfer?: unknown[]) {
    const m = msg as { type: string };
    if (m.type === "init") {
      setTimeout(() => {
        this.trigger({ data: { type: "ready" } });
      }, 0);
    }
  }

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    this.handlers.set(type + handler.toString(), handler);
  }

  removeEventListener(_type: string, _handler: (e: MessageEvent) => void) {
    // noop
  }

  trigger(e: MessageEvent) {
    this.handlers.forEach((h) => h(e));
  }

  terminate() {
    this.handlers.clear();
  }
}

// Store original Worker
const OriginalWorker = globalThis.Worker;

describe("useHeicConversion", () => {
  beforeEach(() => {
    // @ts-expect-error - mock worker
    globalThis.Worker = MockWorker;
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useHeicConversion());
    expect(result.current.state.status).toBe("idle");
  });

  it("transitions to selected state when files are added", () => {
    const { result } = renderHook(() => useHeicConversion());

    const file = new File(["fake-heic-data"], "test.heic", {
      type: "application/octet-stream",
    });

    act(() => {
      result.current.selectFiles([file]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("test.heic");
    }
  });

  it("filters non-HEIC files", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([
        new File(["a"], "photo.heic", { type: "application/octet-stream" }),
        new File(["b"], "document.pdf", { type: "application/pdf" }),
        new File(["c"], "image.jpg", { type: "image/jpeg" }),
      ]);
    });

    expect(result.current.state.status).toBe("selected");
    if (result.current.state.status === "selected") {
      expect(result.current.state.files).toHaveLength(1);
      expect(result.current.state.files[0].name).toBe("photo.heic");
    }
  });

  it("resets to idle state", () => {
    const { result } = renderHook(() => useHeicConversion());

    act(() => {
      result.current.selectFiles([new File(["a"], "test.heic", { type: "application/octet-stream" })]);
    });

    expect(result.current.state.status).toBe("selected");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.status).toBe("idle");
  });
});
```

- [ ] **Step 2: Install @testing-library/react if needed**

```bash
npm install -D @testing-library/react
```

- [ ] **Step 3: Run the tests**

```bash
npm test
```

Expected:
```
 ✓ src/lib/__tests__/pdf-generator.test.ts (4 tests)
 ✓ src/hooks/__tests__/useHeicConversion.test.ts (4 tests)
 PASS
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/__tests__/useHeicConversion.test.ts
git commit -m "test: add useHeicConversion unit tests"
```

---

### Verification

After all phases complete:

1. **Build**: `npm run build` — should produce a clean build with no TypeScript errors
2. **Dev**: `npm run dev` — navigate to `http://localhost:3000`, verify:
   - Drop zone renders on first load
   - Dragging/selecting HEIC files shows file list
   - Conversion settings show with correct defaults
   - "Convert N files →" button appears
   - Clicking convert triggers the progress bar
   - After conversion, preview dialog shows with thumbnails
   - Page navigation arrows work
   - Download PDF triggers browser download
   - "Convert more" resets to idle state
   - Cancelling during conversion returns to idle
3. **Tests**: `npm test` — all tests pass
4. **Manual tests**: Try with real iPhone HEIC photos (portrait + landscape)
