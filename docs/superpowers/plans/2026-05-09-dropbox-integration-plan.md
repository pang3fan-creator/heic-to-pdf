# Dropbox 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 添加 Dropbox 文件导入（Chooser API）和导出（Saver API），并改造完成页面为稳定的操作页面。

**Architecture:** 新增 dropbox-utils.ts 封装 Chooser/Saver，三个位置（首页/编辑器/完成页）使用统一的 Split Button 组件模式，完成页面改用 CompletePage 组件代替自动下载。

**Tech Stack:** Next.js, Dropbox Dropins JS SDK

---

### Task 1: .env.local + next.config.ts 配置

**Files:**
- Create: `.env.local`（已 gitignored）
- Modify: `next.config.ts`

- [ ] **Step 1: 创建 .env.local**

```bash
echo "NEXT_PUBLIC_DROPBOX_APP_KEY=" >> .env.local
```

**Note:** 用户需在 [Dropbox Developer Console](https://www.dropbox.com/developers/apps) 创建 App（选择 Dropbox API → App folder 或 Full Dropbox → 命名）后获取 App Key，填入此文件。

- [ ] **Step 2: 更新 next.config.ts**

添加 contentSecurityPolicy 或 headers 允许 dropbox.com CDN：

```typescript
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};
```

无需额外 CSP 配置 — Dropbox 脚本通过 `<script>` 标签加载，不受 Next.js 默认 CSP 限制。

---

### Task 2: 新增 dropbox-utils.ts

**Files:**
- Create: `src/lib/dropbox-utils.ts`

- [ ] **Step 1: 实现 Dropbox SDK 加载 + Chooser + Saver**

```typescript
// src/lib/dropbox-utils.ts

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: DropboxChooseOptions) => void;
      save: (options: DropboxSaveOptions) => void;
    };
  }
}

interface DropboxChooserFile {
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

interface DropboxChooseOptions {
  success: (files: DropboxChooserFile[]) => void;
  cancel?: () => void;
  linkType: "preview" | "direct";
  multiselect: boolean;
  extensions?: string[];
  sizeLimit?: number;
}

interface DropboxSaveOptions {
  files: { url: string; name: string }[];
  success?: () => void;
  cancel?: () => void;
  error?: (err: Error) => void;
}

const SUPPORTED_DROPBOX_EXTENSIONS = [
  ".heic", ".heif",
  ".jpg", ".jpeg",
  ".png", ".webp",
];

let sdkLoading: Promise<void> | null = null;

/**
 * Load Dropbox SDK if not already loaded.
 */
async function ensureDropboxSdk(): Promise<void> {
  if (typeof window !== "undefined" && window.Dropbox?.choose) return;
  if (sdkLoading) return sdkLoading;

  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
  if (!appKey) {
    throw new Error("Dropbox App Key not configured");
  }

  sdkLoading = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", appKey);
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

  return sdkLoading;
}

/**
 * Open Dropbox Chooser and return selected files as File objects.
 */
export async function pickFromDropbox(): Promise<File[]> {
  await ensureDropboxSdk();

  return new Promise<File[]>((resolve, reject) => {
    if (!window.Dropbox?.choose) {
      reject(new Error("Dropbox SDK not available"));
      return;
    }

    window.Dropbox.choose({
      success: async (files) => {
        try {
          const results = await Promise.all(
            files
              .filter((f) => !f.isDir)
              .map(async (f) => {
                const resp = await fetch(f.link, { mode: "cors" });
                const blob = await resp.blob();
                return new File([blob], f.name, { type: blob.type });
              }),
          );
          resolve(results);
        } catch (err) {
          reject(err);
        }
      },
      cancel: () => resolve([]),
      linkType: "direct",
      multiselect: true,
      extensions: SUPPORTED_DROPBOX_EXTENSIONS,
    });
  });
}

/**
 * Save a Blob to Dropbox via Saver API.
 * Returns true if saved, false if cancelled.
 */
export async function saveToDropbox(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  await ensureDropboxSdk();

  return new Promise<boolean>((resolve) => {
    if (!window.Dropbox?.save) {
      resolve(false);
      return;
    }

    const url = URL.createObjectURL(blob);

    window.Dropbox.save({
      files: [{ url, name: filename }],
      success: () => {
        URL.revokeObjectURL(url);
        resolve(true);
      },
      cancel: () => {
        URL.revokeObjectURL(url);
        resolve(false);
      },
      error: () => {
        URL.revokeObjectURL(url);
        resolve(false);
      },
    });
  });
}
```

- [ ] **Step 2: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 3: 修改 useHeicConversion.ts — 取消自动下载 + 自动重置

**Files:**
- Modify: `src/hooks/useHeicConversion.ts`

- [ ] **Step 1: 删除自动下载代码**

在 `startConversion` 中，找到 complete 状态之后的代码（约第 393-409 行），删除：

```typescript
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
```

替换为：
```typescript
// Persist state for manual download/save actions
filesRef.current = files;
```

**注意：** 保留 `filesRef.current = files`（已在第 349 行执行，但确保重置逻辑不执行）。`complete` 状态不再自动退出，用户通过界面操作（Start Over、下载完成等）手动触发 reset。

- [ ] **Step 2: 验证 TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 4: 新建 CompletePage.tsx

**Files:**
- Create: `src/components/CompletePage.tsx`

- [ ] **Step 1: 创建组件**

```tsx
// src/components/CompletePage.tsx

"use client";

import { useCallback, useRef, useState } from "react";
import type { ConversionFile } from "@/lib/conversion-types";
import { formatSize, PDF_FILENAME } from "@/lib/conversion-types";
import { saveToDropbox } from "@/lib/dropbox-utils";

interface Props {
  files: ConversionFile[];
  blob: Blob;
  blobType: "pdf" | "zip";
  sizeBytes: number;
  fileCount: number;
  onReset: () => void;
}

type DownloadAction = "device" | "dropbox";

export default function CompletePage({
  files,
  blob,
  blobType,
  sizeBytes,
  fileCount,
  onReset,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filename = blobType === "pdf" ? PDF_FILENAME : "images.zip";
  const succeededFiles = files.filter((f) => f.status === "done");
  const skippedFiles = files.filter((f) => f.status === "skipped");

  const handleDownloadToDevice = useCallback(() => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDropdownOpen(false);
  }, [blob, filename]);

  const handleSaveToDropbox = useCallback(async () => {
    setDropdownOpen(false);
    await saveToDropbox(blob, filename);
  }, [blob, filename]);

  return (
    <div className="complete-page">
      <div className="complete-page-content">
        <div className="complete-icon-circle">✓</div>
        <h2 className="complete-title">Conversion Complete!</h2>

        {/* File results */}
        <div className="complete-file-list">
          {succeededFiles.map((f) => (
            <div key={f.id} className="complete-file-row done">
              <span className="complete-file-icon">✓</span>
              <span className="complete-file-name">{f.name}</span>
              <span className="complete-file-size">{formatSize(f.size)}</span>
            </div>
          ))}
          {skippedFiles.map((f) => (
            <div key={f.id} className="complete-file-row skipped">
              <span className="complete-file-icon">✕</span>
              <span className="complete-file-name">{f.name}</span>
              <span className="complete-file-error">{f.error || "Skipped"}</span>
            </div>
          ))}
        </div>

        {/* Output info */}
        <div className="complete-output-info">
          <span className="complete-output-name">{filename}</span>
          <span className="complete-output-size">{formatSize(sizeBytes)}</span>
        </div>

        {/* Actions */}
        <div className="complete-actions">
          <div className="split-btn-wrap" ref={dropdownRef}>
            <button
              className="split-btn-main"
              onClick={handleDownloadToDevice}
              type="button"
            >
              Download
            </button>
            <button
              className="split-btn-arrow"
              onClick={() => setDropdownOpen((v) => !v)}
              type="button"
              aria-label="More download options"
            >
              ▾
            </button>
            {dropdownOpen && (
              <div className="split-btn-dropdown">
                <button onClick={handleDownloadToDevice} type="button">
                  Download to device
                </button>
                <button onClick={handleSaveToDropbox} type="button">
                  Save to Dropbox
                </button>
              </div>
            )}
          </div>

          <button className="complete-start-over" onClick={onReset} type="button">
            ← Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 添加 CSS 样式**

在 `src/app/globals.css` 末尾添加：

```css
/* Complete Page */
.complete-page {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.complete-page-content {
  max-width: 480px;
  width: 100%;
  padding: 40px 24px;
  text-align: center;
}
.complete-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.complete-title {
  font-size: 22px;
  font-weight: 600;
  margin-bottom: 24px;
}
.complete-file-list {
  text-align: left;
  margin-bottom: 20px;
}
.complete-file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--surface);
  margin-bottom: 4px;
  font-size: 14px;
}
.complete-file-row.done .complete-file-icon {
  color: var(--accent);
}
.complete-file-row.skipped .complete-file-icon {
  color: #e44;
}
.complete-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.complete-file-size {
  color: var(--muted);
  flex-shrink: 0;
}
.complete-file-error {
  color: #e44;
  font-size: 12px;
}
.complete-output-info {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}
.complete-output-name {
  font-weight: 500;
}
.complete-output-size {
  color: var(--muted);
}
.complete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}
.complete-start-over {
  padding: 10px 20px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}
.complete-start-over:hover {
  background: var(--surface);
}
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 5: 修改 ConversionContainer.tsx — 新增 complete 分支

**Files:**
- Modify: `src/components/ConversionContainer.tsx`

- [ ] **Step 1: 新增 complete 分支渲染**

在 error 分支之前（或之后），添加 complete 分支：

```tsx
import CompletePage from "./CompletePage";

// ... inside the return, after editor branch, before or after error branch:

{s.status === "complete" && (
  <CompletePage
    files={s.files}
    blob={s.blob}
    blobType={s.blobType}
    sizeBytes={s.sizeBytes}
    fileCount={s.files.length}
    onReset={conversion.reset}
  />
)}
```

- [ ] **Step 2: 清理 DropZone 的 isComplete prop**

由于 complete 状态现在由 CompletePage 独立渲染，DropZone 不再需要 `isComplete` 或 `isConverting` 时的文件列表展示。将 DropZone 的 props 简化为：

```tsx
<DropZone
  onFilesSelected={s.status === "editor" ? conversion.addMoreFiles : conversion.selectFiles}
  isConverting={s.status === "converting"}
  files={s.status === "converting" || s.status === "error" ? s.files : undefined}
  progress={s.status === "converting" ? s.progress : undefined}
  currentFileIndex={s.status === "converting" ? s.currentFileIndex : undefined}
  onCancel={conversion.cancel}
/>
```

**注意：** 移除 `isComplete` 和相关 props。如果 DropZone 内部仍有 `isComplete` 处理逻辑（`showProcessing` 中包含 `isComplete`），需要相应去除。

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 6: 修改 DropZone.tsx — Split Button

**Files:**
- Modify: `src/components/DropZone.tsx`

- [ ] **Step 1: 替换 Browse 按钮为 Split Button**

将第 157 行的 `<button className="browse-btn"...>` 替换为带下拉菜单的 split button。

改动要点：
1. 添加 `dropdownOpen` 状态和 `dropdownRef`
2. 添加 `handleFromDropbox` 回调（调用 `pickFromDropbox` 后调用 `onFilesSelected`）
3. 替换 button 为 split button 结构
4. 点击菜单外部关闭下拉

```tsx
// 在组件内添加新的 state 和 ref
const [browseOpen, setBrowseOpen] = useState(false);
const browseRef = useRef<HTMLDivElement>(null);

const handleFromDropbox = useCallback(async () => {
  setBrowseOpen(false);
  const { pickFromDropbox } = await import("@/lib/dropbox-utils");
  const files = await pickFromDropbox();
  if (files.length > 0) {
    onFilesSelected(files);
  }
}, [onFilesSelected]);

// 点击外部关闭
useEffect(() => {
  const handleClick = (e: MouseEvent) => {
    if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
      setBrowseOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);
```

```tsx
{/* Replace the old browse-btn */}
<div className="split-btn-wrap" ref={browseRef}>
  <button className="split-btn-main" onClick={onBrowse} type="button">
    {t("browseBtn")}
  </button>
  <button
    className="split-btn-arrow"
    onClick={() => setBrowseOpen((v) => !v)}
    type="button"
    aria-label="More options"
  >
    ▾
  </button>
  {browseOpen && (
    <div className="split-btn-dropdown">
      <button onClick={onBrowse} type="button">From your device</button>
      <button onClick={handleFromDropbox} type="button">From Dropbox</button>
    </div>
  )}
</div>
```

- [ ] **Step 2: 添加 CSS 样式**

在 `src/app/globals.css` 末尾添加：

```css
/* Split Button */
.split-btn-wrap {
  position: relative;
  display: inline-flex;
}
.split-btn-main {
  padding: 10px 24px;
  border: 1px solid var(--accent);
  border-right: none;
  border-radius: 100px 0 0 100px;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.split-btn-main:hover {
  opacity: 0.9;
}
.split-btn-arrow {
  padding: 10px 12px;
  border: 1px solid var(--accent);
  border-radius: 0 100px 100px 0;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  line-height: 1;
}
.split-btn-arrow:hover {
  opacity: 0.9;
}
.split-btn-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 50;
  overflow: hidden;
}
.split-btn-dropdown button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--fg);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.split-btn-dropdown button:hover {
  background: var(--accent-soft);
}
```

- [ ] **Step 3: TypeScript 检查**

```bash
npx tsc --noEmit
```
Expected: no errors.

---

### Task 7: 修改 EditorOverlay.tsx — Split Button for Add Photos

**Files:**
- Modify: `src/components/EditorOverlay.tsx`

- [ ] **Step 1: 替换 Add Photos 按钮为 Split Button**

与 DropZone 相同的模式。将第 378-384 行的 button 替换为 split button：

```tsx
const [addOpen, setAddOpen] = useState(false);
const addRef = useRef<HTMLDivElement>(null);

const handleAddFromDropbox = useCallback(async () => {
  setAddOpen(false);
  const { pickFromDropbox } = await import("@/lib/dropbox-utils");
  const files = await pickFromDropbox();
  if (files.length > 0) {
    onAddFiles(files);
  }
}, [onAddFiles]);

// Click outside close
useEffect(() => {
  const handleClick = (e: MouseEvent) => {
    if (addRef.current && !addRef.current.contains(e.target as Node)) {
      setAddOpen(false);
    }
  };
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);
```

替换 JSX：
```tsx
<div className="split-btn-wrap" ref={addRef}>
  <button className="editor-add-btn" onClick={handleAddClick} type="button">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
    {t("addPhotos")}
  </button>
  <button
    className="split-btn-arrow editor-add-arrow"
    onClick={() => setAddOpen((v) => !v)}
    type="button"
    aria-label="More options"
  >
    ▾
  </button>
  {addOpen && (
    <div className="split-btn-dropdown">
      <button onClick={handleAddClick} type="button">From your device</button>
      <button onClick={handleAddFromDropbox} type="button">From Dropbox</button>
    </div>
  )}
</div>
```

额外 CSS for editor add button arrow：
```css
.editor-add-arrow {
  padding: 0 10px;
  border: 1px solid var(--border);
  border-left: none;
  border-radius: 0 8px 8px 0;
  background: var(--surface);
  color: var(--fg);
  font-size: 12px;
  cursor: pointer;
}
.editor-add-btn {
  border-radius: 8px 0 0 8px;
}
```

---

### Task 8: 更新翻译

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: 添加新翻译**

在 `editor` 段和 `hero.dropzone` 段添加：

```json
"dropzone": {
  "title": "...",
  "subtitle": "...",
  "hint": "...",
  "browseBtn": "Browse Files",
  "privacy": "...",
  "fromDevice": "From your device",
  "fromDropbox": "From Dropbox"
},
...

"editor": {
  ...
  "addPhotos": "Add Photos",
  "fromDevice": "From your device",
  "fromDropbox": "From Dropbox",
  ...
  "complete": {
    "title": "Conversion Complete!",
    "download": "Download",
    "toDevice": "Download to device",
    "toDropbox": "Save to Dropbox",
    "startOver": "← Start Over"
  }
}
```

---

### Task 9: 验证

- [ ] **Step 1: 完整验证**

```bash
npm run build
```
Expected: build 成功。

- [ ] **Step 2: 功能检查**

1. 首页 Browse 按钮 → 点击右侧 ▾ → 显示 From your device / From Dropbox
2. 点击 From your device → 打开本地文件选择器
3. **如需测试 Dropbox**: 需要设置 `.env.local` 中的 `NEXT_PUBLIC_DROPBOX_APP_KEY`
4. 转换完成后 → 显示 CompletePage，不再自动下载
5. Download → ▾ → Download to device → 下载文件
6. Download → ▾ → Save to Dropbox → 弹出 Dropbox 窗口
7. Start Over → 回到首页 idle
8. 编辑器 Add Photos → ▾ → From your device / From Dropbox
