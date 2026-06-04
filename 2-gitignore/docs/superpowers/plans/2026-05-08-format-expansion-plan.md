# 图片格式扩展实现计划 — JPEG/PNG/WebP 支持

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页 HEIC-to-PDF 功能扩展支持 JPEG、PNG、WebP 三种格式，统一解码层输出 RGBA，PDF 嵌入走各自最佳路径（JPEG/PNG 直接嵌入原始字节）。

**Architecture:** 新增 `image-decoder.ts` 封装格式路由（HEIC→Worker，其余→`createImageBitmap`），pdf-generator 支持 `embedJpg`/`embedPng` 根据格式选择，DropZone 和 EditorOverlay 更新文件过滤和扩展名显示。

**Tech Stack:** Next.js, pdf-lib, libheif (HEIC Worker)

---

### Task 1: 更新类型定义和辅助函数

**Files:**
- Modify: `src/lib/conversion-types.ts`

- [ ] **Step 1: 添加 ImageFormat 类型、getFileType 函数和相关常量**

将以下代码追加到 `src/lib/conversion-types.ts` 中（在 `PDF_FILENAME` 常量之后，`formatSize` 函数之前）：

```typescript
// Supported image formats
export type ImageFormat = "heic" | "jpeg" | "png" | "webp";

export const SUPPORTED_EXTENSIONS: Record<ImageFormat, string[]> = {
  heic: [".heic", ".HEIC", ".heif", ".HEIF"],
  jpeg: [".jpg", ".jpeg", ".JPG", ".JPEG"],
  png: [".png", ".PNG"],
  webp: [".webp", ".WEBP"],
};

export function getFileType(file: File): ImageFormat | "unsupported" {
  const name = file.name.toLowerCase();
  for (const [format, exts] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (exts.some((ext) => name.endsWith(ext.toLowerCase()))) {
      return format as ImageFormat;
    }
  }
  return "unsupported";
}

/** Input type for buildPdf — carries format info for optimal PDF embedding. */
export interface PdfImageInput {
  format: ImageFormat;
  data: Uint8Array; // JPEG/PNG=原始字节, HEIC/WebP=Canvas编码的PNG字节
  width: number;
  height: number;
}
```

- [ ] **Step 2: 更新 PDF_FILENAME**

将 `PDF_FILENAME` 常量的值从 `"HEIC_Converted.pdf"` 改为 `"my-images.pdf"`：

```typescript
export const PDF_FILENAME = "my-images.pdf";
```

- [ ] **Step 3: 运行现有测试，确保不误伤**

Run: `npm test`
Expected: 所有现有测试通过（后续 Task 会更新测试以覆盖新格式）。

---

### Task 2: 新增 image-decoder.ts — 统一解码层

**Files:**
- Create: `src/lib/image-decoder.ts`

- [ ] **Step 1: 实现 decodeImage 函数**

```typescript
// src/lib/image-decoder.ts

import type { ImageFormat } from "./conversion-types";

export interface DecodeResult {
  rgbaBuffer: Uint8Array;
  width: number;
  height: number;
}

/**
 * Decode an image file to RGBA pixel data.
 * - HEIC: uses libheif Web Worker
 * - JPEG/PNG/WebP: uses browser createImageBitmap + Canvas
 */
export async function decodeImage(
  file: File,
  format: ImageFormat,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  if (format === "heic") {
    return decodeHeic(file, signal);
  }
  return decodeBrowserImage(file, signal);
}

/**
 * Decode HEIC via libheif Web Worker.
 * Creates a worker, sends the file buffer, returns RGBA data.
 */
async function decodeHeic(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const worker = new Worker(
    new URL("@/lib/heic-worker", import.meta.url),
  );

  return new Promise<DecodeResult>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        file.arrayBuffer().then((buffer) => {
          worker.postMessage({ type: "decode", fileIndex: 0, buffer }, [buffer]);
        });
      } else if (msg.type === "file-done") {
        cleanup();
        resolve({
          rgbaBuffer: msg.rgbaBuffer,
          width: msg.width,
          height: msg.height,
        });
      } else if (msg.type === "file-error") {
        cleanup();
        reject(new Error(msg.error || "HEIC decode failed"));
      }
    };

    const cleanup = () => {
      worker.removeEventListener("message", onMessage);
      worker.terminate();
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage({ type: "init" });

    if (signal) {
      signal.addEventListener("abort", cleanup, { once: true });
    }
  });
}

/**
 * Decode JPEG/PNG/WebP using the browser's built-in image decoder.
 */
async function decodeBrowserImage(
  file: File,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const bitmap = await createImageBitmap(file, {
    resizeQuality: "high",
  });

  if (signal?.aborted) {
    bitmap.close();
    throw new DOMException("Aborted", "AbortError");
  }

  const { width, height } = bitmap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas context not available");
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  return {
    rgbaBuffer: new Uint8Array(imageData.data),
    width,
    height,
  };
}
```

- [ ] **Step 2: 运行 lint 检查**

Run: `npm run lint`
Expected: 通过（或仅现有警告）。

---

### Task 3: 更新 pdf-generator.ts — 支持 JPEG 直接嵌入

**Files:**
- Modify: `src/lib/pdf-generator.ts`

- [ ] **Step 1: 修改 buildPdf 接受 PdfImageInput**

将 `buildPdf` 的参数类型从 `PageImage[]` 改为 `PdfImageInput[]`，并添加 JPEG 分支：

```typescript
// src/lib/pdf-generator.ts

import { PDFDocument } from "pdf-lib";
import {
  type ConversionSettings,
  type PdfImageInput,
  PAGE_SIZES,
  MARGIN_VALUES,
  ORIGINAL_MAX_PT,
} from "./conversion-types";

// 移除旧的 PageImage 接口，不再需要
```

更新 `buildPdf` 函数：

```typescript
export async function buildPdf(
  images: PdfImageInput[],
  settings: ConversionSettings,
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const img of images) {
    let image;
    try {
      if (img.format === "jpeg") {
        image = await pdfDoc.embedJpg(img.data);
      } else {
        image = await pdfDoc.embedPng(img.data);
      }
    } catch (err) {
      console.warn("Failed to embed image in PDF:", err);
      continue;
    }

    const layout = calculateLayout(img.width, img.height, settings);
    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(image, {
      x: layout.x,
      y: layout.y,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
```

- [ ] **Step 2: 运行测试验证**

Run: `npm test`
Expected: 现有测试可能因 `buildPdf` 参数类型变化而失败。确认失败后继续。

---

### Task 4: 更新 DropZone.tsx — 支持多格式文件选择

**Files:**
- Modify: `src/components/DropZone.tsx`

- [ ] **Step 1: 替换 isHeicFile 为 getFileType，更新 accept 属性和文件名显示**

改动分四处：

**a) 替换导入：** 在顶部导入 `getFileType` 替代 `isHeicFile`（注意 `isHeicFile` 当前是文件内函数，需移除）

移除文件内的 `isHeicFile` 函数（第 17-20 行）。

**b) 更新 `accept` 属性：** 第 175 行：
```tsx
accept=".heic,.HEIC,.heif,.HEIF,.jpg,.jpeg,.JPEG,.JPG,.png,.PNG,.webp,.WEBP"
```

**c) 更新 `handleFiles` 过滤条件（第 37-39 行）：**
```typescript
const filtered = Array.from(fileList).filter(
  (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
);
```

**d) 更新文件名显示正则（第 109 行）：**
```typescript
{f.name.replace(/\.(heic|heif|HEIC|HEIF|jpg|jpeg|JPG|JPEG|png|PNG|webp|WEBP)$/, "")}
```

**最终文件的 import 部分：**
```typescript
import { MAX_FILE_SIZE, formatSize, getFileType } from "@/lib/conversion-types";
```

- [ ] **Step 2: 验证 build 通过**

Run: `npm run lint`
Expected: 通过。

---

### Task 5: 更新 EditorOverlay.tsx — 扩展名显示兼容所有格式

**Files:**
- Modify: `src/components/EditorOverlay.tsx`

- [ ] **Step 1: 更新文件名后缀去除正则（第 251 行附近）**

将：
```typescript
{file.name.replace(/\.(heic|HEIC|heif|HEIF)$/, "")}
```

改为：
```typescript
{file.name.replace(
  /\.(heic|heif|HEIC|HEIF|jpg|jpeg|JPG|JPEG|png|PNG|webp|WEBP)$/,
  "",
)}
```

---

### Task 6: 更新 useHeicConversion.ts — 格式路由解码/编码

**Files:**
- Modify: `src/hooks/useHeicConversion.ts`

- [ ] **Step 1: 更新 import**

将：
```typescript
import {
  type ConversionFile,
  ...
  resolveOrientation,
} from "@/lib/conversion-types";
import { buildPdf } from "@/lib/pdf-generator";
```

改为：
```typescript
import {
  type ConversionFile,
  ...
  type PdfImageInput,
  PDF_FILENAME,
  DEFAULT_SETTINGS,
  getFileType,
  resolveOrientation,
} from "@/lib/conversion-types";
import { buildPdf } from "@/lib/pdf-generator";
import { decodeImage } from "@/lib/image-decoder";
```

- [ ] **Step 2: 移除文件内的 `isHeicFile` 函数**

删除第 30-33 行的 `isHeicFile` 函数。

- [ ] **Step 3: 更新 `selectFiles` — 替换文件过滤**

将第 202-203 行：
```typescript
const valid = incoming.filter(
  (f) => isHeicFile(f) && f.size <= MAX_FILE_SIZE,
);
```

改为：
```typescript
const valid = incoming.filter(
  (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
);
```

- [ ] **Step 4: 更新 `addMoreFiles` — 替换文件过滤**

将第 227-229 行：
```typescript
const valid = incoming.filter(
  (f) => isHeicFile(f) && f.size <= MAX_FILE_SIZE,
);
```

改为：
```typescript
const valid = incoming.filter(
  (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
);
```

- [ ] **Step 5: 重写 `decodePendingFiles` — 格式路由解码**

`decodePendingFiles` 当前只启动一个 HEIC Worker 来处理所有文件。需要改为对每个文件根据 `getFileType` 调用对应的解码路径。

**核心思路：** 遍历文件列表，对每个未解码的文件调用 `decodeImage(file, format)`，然后用 Canvas 缩放为缩略图和预览。不再全局启动 Worker。

重写第 67-198 行的 `decodePendingFiles`：

```typescript
const decodePendingFiles = useCallback(async () => {
  if (decodeWorkerRef.current) return; // already decoding

  const abortController = new AbortController();
  const signal = abortController.signal;

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
        result = await decodeImage(f.file, format, signal);
      } catch {
        continue; // Silently skip decode failures
      }

      if (!mountedRef.current || signal.aborted) return;

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
    if (decodeWorkerRef.current) {
      decodeWorkerRef.current = null;
    }
  }
}, []);
```

**注意：** `decodePendingFiles` 不再创建 Worker 实例。`decodeWorkerRef` 只作为"正在解码"的标志位使用（保留此 ref 可避免同时多次解码）。

- [ ] **Step 6: 重写 `startConversion` 中的编码阶段 — 格式路由**

当前第 284-418 行，每个文件都走 Worker 解码 → Canvas PNG 编码。改为：

**a) 文件循环中，根据格式决定编码方式：**

替换第 299-417 行（从 `const pdfImages` 声明开始到 `files[i] = { ...files[i], status: "done" }` 结束）：

```typescript
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

  const format = getFileType(files[i].file);
  if (format === "unsupported") {
    files[i] = { ...files[i], status: "skipped", error: "Unsupported format" };
    continue;
  }

  const file = files[i].file;
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
    // HEIC or WebP: decode via worker or createImageBitmap → Canvas → PNG
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
```

**b) 更新 `buildPdf` 调用（第 449-452 行）：**

当前 `buildPdf` 接收 `{ pngBytes, width, height }[]`。现在 `pdfImages` 已经是 `PdfImageInput[]` 类型，调用处无需改动。

- [ ] **Step 7: 更新 cancel — 清理新增的 AbortController**

`cancel` 函数中不需要额外改动，现有逻辑已清理 worker 和状态。`AbortController` 在 `decodePendingFiles` 中作为局部变量，函数退出时自动 GC。

---

### Task 7: 更新测试

**Files:**
- Modify: `src/hooks/__tests__/useHeicConversion.test.ts`
- Modify: `src/lib/__tests__/pdf-generator.test.ts`

- [ ] **Step 1: 更新 useHeicConversion 测试 — 替换文件过滤测试**

找到测试 "filters non-HEIC files"，将其从只保留 HEIC 改为放行 JPEG/PNG/WebP：

```typescript
it("filters unsupported files", () => {
  const { result } = renderHook(() => useHeicConversion());

  const validHeic = new File(["dummy"], "photo.heic", { type: "image/heic" });
  const validJpg = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
  const validPng = new File(["dummy"], "photo.png", { type: "image/png" });
  const validWebp = new File(["dummy"], "photo.webp", { type: "image/webp" });
  const invalidPdf = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
  const invalidGif = new File(["dummy"], "anim.gif", { type: "image/gif" });

  act(() => {
    result.current.selectFiles([validHeic, validJpg, validPng, validWebp, invalidPdf, invalidGif]);
  });

  expect(result.current.state.status).toBe("editor");
  if (result.current.state.status === "editor") {
    expect(result.current.state.files).toHaveLength(4);
  }
});
```

- [ ] **Step 2: 更新 pdf-generator 测试 — 适配 PdfImageInput**

将测试中传递给 `buildPdf` 的 `{ pngBytes, width, height }` 改为 `{ format, data, width, height }`：

这些测试位于 `src/lib/__tests__/pdf-generator.test.ts`。构建 `buildPdf` 调用时的数据改为：

```typescript
const result = await buildPdf(
  [
    {
      format: "png",
      data: pngBytes,
      width: 100,
      height: 200,
    },
  ],
  settings,
);
```

- [ ] **Step 3: 运行全部测试**

Run: `npm test`
Expected: 所有测试通过。

---

### Task 8: 最终验证

- [ ] **Step 1: Lint 检查**

Run: `npm run lint`
Expected: 无错误。

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 3: 清理废弃代码**

确认以下已被移除：
- `src/hooks/useHeicConversion.ts` 中的 `isHeicFile` 函数
- `src/components/DropZone.tsx` 中的 `isHeicFile` 函数
- `src/lib/pdf-generator.ts` 中的 `PageImage` 接口
- `src/lib/conversion-types.ts` 中旧的 `PDF_FILENAME` 值（已改为 `"my-images.pdf"`）
