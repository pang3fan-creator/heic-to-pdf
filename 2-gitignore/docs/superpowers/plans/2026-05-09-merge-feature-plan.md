# Merge 功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为编辑器增加 merge 开关，用户可选择将多张图片合并为一份 PDF 或分别生成多个 PDF 并打包为 zip 下载。

**Architecture:** ConversionSettings 新增 `merge: boolean` 控制转换分支；新增 zip-utils.ts 处理冲突命名和 JSZip 打包；startConversion 根据 merge 值走不同下载路径。

**Tech Stack:** Next.js, pdf-lib, jszip

---

### Task 1: 安装依赖 + 更新类型

**Files:**
- Modify: `package.json`（安装 jszip）
- Modify: `src/lib/conversion-types.ts`

- [ ] **Step 1: 安装 jszip**

```bash
npm install jszip
```

- [ ] **Step 2: 为 ConversionSettings 增加 merge 字段**

在 `src/lib/conversion-types.ts` 的 `ConversionSettings` 接口中添加 `merge: boolean`：

```typescript
export interface ConversionSettings {
  paperSize: "original" | "a4" | "letter" | "legal" | "a3";
  margins: "none" | "narrow" | "normal" | "wide";
  orientation: "portrait" | "landscape" | "auto";
  merge: boolean;
}
```

在 `DEFAULT_SETTINGS` 中添加 `merge: true`：

```typescript
export const DEFAULT_SETTINGS: ConversionSettings = {
  paperSize: "a4",
  margins: "narrow",
  orientation: "portrait",
  merge: true,
};
```

- [ ] **Step 3: 优化 complete 状态类型**

当前 `ConversionState` 的 complete 分支：
```typescript
| {
    status: "complete";
    files: ConversionFile[];
    pdfBlob: Blob;
    pdfSizeBytes: number;
  }
```

改为更通用的结构（同时支持 pdf 和 zip）：
```typescript
| {
    status: "complete";
    files: ConversionFile[];
    blob: Blob;
    blobType: "pdf" | "zip";
    sizeBytes: number;
  }
```

- [ ] **Step 4: 运行测试确认当前通过**

```bash
npm test
```
Expected: 23 passed.

---

### Task 2: 新增 zip-utils.ts

**Files:**
- Create: `src/lib/zip-utils.ts`

- [ ] **Step 1: 实现 resolvePdfNames — 冲突检测命名**

```typescript
// src/lib/zip-utils.ts

import JSZip from "jszip";

/**
 * Generate non-conflicting PDF filenames from source file names.
 *
 * Example:
 *   ["1.jpg", "1.png", "1-1.jpg"]
 *   → ["1.pdf", "1-1.pdf", "1-1-1.pdf"]
 */
export function resolvePdfNames(files: { name: string }[]): string[] {
  const used = new Set<string>();
  const result: string[] = [];

  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, "");
    let candidate = `${base}.pdf`;
    let counter = 1;

    while (used.has(candidate)) {
      candidate = `${base}-${counter}.pdf`;
      counter++;
    }

    used.add(candidate);
    result.push(candidate);
  }

  return result;
}
```

- [ ] **Step 2: 实现 createZip — JSZip 打包**

```typescript
/**
 * Bundle multiple PDF blobs into a single zip Blob.
 */
export async function createZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const { name, blob } of entries) {
    zip.file(name, blob);
  }
  return zip.generateAsync({ type: "blob" });
}
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: 无错误（或仅预存警告）。

---

### Task 3: 修改 EditorOverlay.tsx — merge toggle UI

**Files:**
- Modify: `src/components/EditorOverlay.tsx`
- Modify: `messages/en.json`

- [ ] **Step 1: 在侧边栏 settings section 末尾添加 merge toggle**

在 sidebar 的 orientation select 之后、sidebar-footer 之前，添加 merge 开关：

```tsx
<div className="sidebar-field">
  <div className="sidebar-field-label">{t("sidebar.merge")}</div>
  <label className="sidebar-toggle">
    <input
      type="checkbox"
      checked={settings.merge}
      onChange={(e) =>
        onSettingsChange({
          ...settings,
          merge: e.target.checked,
        })
      }
    />
    <span className="sidebar-toggle-track">
      <span className="sidebar-toggle-thumb" />
    </span>
    <span className="sidebar-toggle-label">
      {settings.merge
        ? t("sidebar.mergeOn")
        : t("sidebar.mergeOff")}
    </span>
  </label>
</div>
```

- [ ] **Step 2: 更新文件计数区域显示**

在 sidebar-footer 中（sidebar-file-count 附近），当 `merge=false` 时显示 `"{n} files → {n} PDFs in .zip"`：

```tsx
<div className="sidebar-file-count">
  {settings.merge
    ? t("fileCount", { count: files.length })
    : `${files.length} files → ${files.length} PDFs in .zip`}
</div>
```

- [ ] **Step 3: 在 en.json 中添加翻译**

在 `editor.sidebar` 中添加：
```json
"merge": "Merge PDFs",
"mergeOn": "Combined",
"mergeOff": "Separate"
```

- [ ] **Step 4: 添加 CSS 样式**

在 `src/app/globals.css` 中的 sidebar 相关样式后添加：

```css
.sidebar-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.sidebar-toggle input {
  display: none;
}
.sidebar-toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--border);
  border-radius: 11px;
  transition: background 0.2s;
}
.sidebar-toggle input:checked + .sidebar-toggle-track {
  background: var(--accent);
}
.sidebar-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.sidebar-toggle input:checked + .sidebar-toggle-track .sidebar-toggle-thumb {
  transform: translateX(18px);
}
.sidebar-toggle-label {
  font-size: 13px;
  color: var(--muted);
}
```

---

### Task 4: 修改 useHeicConversion.ts — merge 分支逻辑

**Files:**
- Modify: `src/hooks/useHeicConversion.ts`

- [ ] **Step 1: 更新 import**

添加 `resolvePdfNames` 和 `createZip` 的导入：
```typescript
import { decodeImage } from "@/lib/image-decoder";
import { resolvePdfNames, createZip } from "@/lib/zip-utils";
```

- [ ] **Step 2: 修改 startConversion — 构建 PDF 后的分支逻辑**

将第 346-379 行（从 `const pdfBlob = await buildPdf(...)` 到重置 timeout 结束）整体替换为：

```typescript
if (settings.merge) {
  // === Merge mode: single multipage PDF ===
  const pdfBlob = await buildPdf(pdfImages, {
    ...settings,
    orientation: perImageSettings[0]?.orientation ?? settings.orientation,
  });

  filesRef.current = files;
  if (!mountedRef.current) return;

  setState({
    status: "complete",
    files,
    blob: pdfBlob,
    blobType: "pdf",
    sizeBytes: pdfBlob.size,
  });

  // Auto-download
  downloadBlob(pdfBlob, PDF_FILENAME);
} else {
  // === Non-merge mode: individual PDFs → zip ===
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

  const zipBlob = await createZip(pdfBlobs);

  filesRef.current = files;
  if (!mountedRef.current) return;

  setState({
    status: "complete",
    files,
    blob: zipBlob,
    blobType: "zip",
    sizeBytes: zipBlob.size,
  });

  // Auto-download zip
  downloadBlob(zipBlob, "images.zip");
}

// Helper function (add outside the hook)
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 3: 添加重置 timeout（在两个分支之后）**

在两个分支之后（`if/else` 块之后），添加共同的 1.5s 重置逻辑：

```typescript
// Reset to idle after brief delay to show completion state
setTimeout(() => {
  if (mountedRef.current) {
    filesRef.current = [];
    setState({ status: "idle" });
  }
}, 1500);
```

- [ ] **Step 4: 编译检查**

```bash
npx tsc --noEmit
```
Expected: 无错误。

---

### Task 5: 验证

- [ ] **Step 1: 运行全部测试**

```bash
npm test
```
Expected: 23 passed（现有测试不受影响）。

- [ ] **Step 2: 验证 merge=true（单张图）**

上传 1 张图片 → merge 默认开启 → 点击转换 → 下载 `my-images.pdf`

- [ ] **Step 3: 验证 merge=true（多张图）**

上传 3 张图片 → merge 开启 → 点击转换 → 下载 1 份多页 PDF

- [ ] **Step 4: 验证 merge=false（多张图，无命名冲突）**

上传 `a.jpg`, `b.png` → 关闭 merge → 点击转换 → 下载 `images.zip` → 解压内含 `a.pdf`, `b.pdf`

- [ ] **Step 5: 验证 merge=false（有命名冲突）**

上传 `1.jpg`, `1.png`, `1-1.jpg` → 关闭 merge → 下载 zip → 解压内含 `1.pdf`, `1-1.pdf`, `1-1-1.pdf`

- [ ] **Step 6: 验证 merge 开关持久化**

开启 merge → 关闭再打开编辑器 → merge 值保持为关闭（settings 状态通过 `settingsRef` 持久化）
