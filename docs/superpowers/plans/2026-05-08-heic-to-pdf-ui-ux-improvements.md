# HEIC to PDF UI/UX 改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 改进 ConversionSettings、ConversionContainer 状态视图、PreviewDialog 的 UI 品质，利用已有设计系统 CSS 变量替换内联样式

**Architecture:** 纯 CSS + React 组件层改动，无业务逻辑变更。新增 CSS 类到 globals.css，组件改用 CSS 类替换内联 style。PreviewDialog 改为左侧缩略图导航 + 中央大幅预览 + 响应式布局

**Tech Stack:** Next.js (App Router) / globals.css CSS 变量系统 / next-intl

---

### 并行任务组 A: CSS 类定义 (可并行执行)

### Task A1: 设置面板 CSS 类

**Files:**
- Modify: `src/app/globals.css` (新增 `/* ========== Settings Panel ========== */` 区块)

- [ ] **Step 1: 在 globals.css 末尾新增设置面板样式**

追加以下 CSS 区块到 `src/app/globals.css`:

```css
/* ========== Settings Panel ========== */
.settings-card {
  margin-top: 24px;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: left;
}
.setting-group {
  margin-bottom: 16px;
}
.setting-group:last-child {
  margin-bottom: 0;
}
.setting-group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 10px;
}
.setting-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.setting-option {
  flex: 1;
  min-width: 80px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--fg);
  transition: border-color 0.2s, background 0.2s, opacity 0.2s, transform 0.15s;
  line-height: 1.4;
}
.setting-option:hover {
  border-color: var(--accent);
  opacity: 1;
}
.setting-option.active {
  border: 2px solid var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}
.setting-option .option-sub {
  display: block;
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
  margin-top: 1px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add settings panel CSS classes"
```

### Task A2: 预览对话框 CSS 类

**Files:**
- Modify: `src/app/globals.css` (新增 `/* ========== Preview Dialog ========== */` 区块，位于 settings 之后)

- [ ] **Step 1: 在 globals.css 末尾追加预览对话框样式**

```css
/* ========== Preview Dialog ========== */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0 0 0 / 50%);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.preview-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  width: min(90vw, 820px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}
.preview-header-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
}
.preview-header-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s, color 0.2s;
}
.preview-header-close:hover {
  background: var(--border);
  color: var(--fg);
}
.preview-body {
  display: flex;
  min-height: 380px;
  flex: 1;
  overflow: hidden;
}
.preview-thumbnav {
  width: 100px;
  flex-shrink: 0;
  padding: 12px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid var(--border);
}
.preview-thumbnav-item {
  height: 56px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--muted);
  transition: border-color 0.2s, background 0.2s;
  overflow: hidden;
}
.preview-thumbnav-item:hover {
  border-color: var(--accent);
}
.preview-thumbnav-item.active {
  border: 2px solid var(--accent);
  background: var(--accent-soft);
}
.preview-thumbnav-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  min-height: 300px;
  background: var(--bg);
}
.preview-image {
  max-width: 100%;
  max-height: 360px;
  border-radius: 6px;
  box-shadow: 0 8px 32px oklch(0 0 0 / 15%);
  object-fit: contain;
}
.preview-placeholder {
  color: var(--muted);
  font-size: 14px;
}
.preview-footer {
  border-top: 1px solid var(--border);
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.preview-summary {
  font-size: 12px;
  color: var(--muted);
}
.preview-actions {
  display: flex;
  gap: 10px;
}
.preview-actions .btn-secondary {
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.preview-actions .btn-secondary:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.preview-actions .btn-primary {
  padding: 8px 20px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.preview-actions .btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
```

- [ ] **Step 2: 追加响应式样式到 globals.css 的 `@media (max-width: 900px)` 和 `@media (max-width: 640px)` 区块**

在 `@media (max-width: 900px)` 区块中添加:

```css
  .preview-thumbnav {
    display: none;
  }
  .preview-modal {
    width: 95vw;
  }
```

在 `@media (max-width: 640px)` 区块中添加:

```css
  .preview-overlay {
    align-items: flex-end;
  }
  .preview-modal {
    width: 100vw;
    max-height: 95vh;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .preview-body {
    min-height: 260px;
  }
  .preview-main {
    padding: 16px;
    min-height: 240px;
  }
  .preview-image {
    max-height: 260px;
  }
  .preview-footer {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  .preview-actions {
    flex-direction: column;
  }
  .preview-actions .btn-primary,
  .preview-actions .btn-secondary {
    width: 100%;
    text-align: center;
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add preview dialog CSS classes"
```

### Task A3: 错误状态 + 进度视图 CSS 类

**Files:**
- Modify: `src/app/globals.css` (在 `/* ========== Processing Status ========== */` 区块中追加)

- [ ] **Step 1: 在 Processing Status 区块末尾追加进度视图增强样式**

```css
.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
.progress-info .progress-current {
  font-weight: 500;
}
.progress-track.accent .progress-bar {
  background: linear-gradient(90deg, var(--accent), oklch(72% 0.12 30 / 80%));
}
.file-chip.done {
  border-color: oklch(65% 0.18 145 / 30%) !important;
  background: oklch(65% 0.18 145 / 10%) !important;
}
.file-chip.done .file-status-icon {
  color: oklch(65% 0.18 145);
}
.file-chip.active {
  border-color: var(--accent) !important;
  background: var(--accent-soft) !important;
}
.file-chip.pending {
  opacity: 0.45;
}
.file-chip.skipped {
  border-color: oklch(65% 0.16 50 / 30%) !important;
  background: oklch(65% 0.16 50 / 10%) !important;
}
.file-status-icon {
  font-size: 12px;
  margin-right: 4px;
}
.file-status-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  margin-right: 4px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: 追加错误状态 CSS 区块**

```css
/* ========== Error State ========== */
.error-state {
  margin-top: 20px;
  text-align: center;
}
.error-card {
  display: inline-block;
  background: oklch(65% 0.2 30 / 8%);
  border: 1px solid oklch(65% 0.2 30 / 20%);
  border-radius: var(--radius);
  padding: 28px 24px;
  max-width: 400px;
  text-align: center;
}
.error-icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: oklch(65% 0.2 30 / 12%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  font-size: 20px;
  font-weight: 700;
  color: oklch(65% 0.2 30);
}
.error-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 6px;
}
.error-detail {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 20px;
  line-height: 1.5;
}
.error-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.error-actions .btn-ghost {
  padding: 9px 24px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.error-actions .btn-ghost:hover {
  border-color: var(--accent);
  color: var(--fg);
}
.error-actions .btn-retry {
  padding: 9px 24px;
  border-radius: 100px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}
.error-actions .btn-retry:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add error state and progress view CSS classes"
```

---

### Task B1: 重写 ConversionSettings 组件

**Files:**
- Modify: `src/components/ConversionSettings.tsx` (完全重写)

- [ ] **Step 1: 用卡片式选择器替换原生 radio**

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

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="setting-group">
      <div className="setting-group-label">{label}</div>
      <div className="setting-options">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`setting-option${value === opt.value ? " active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
            {opt.sub && <span className="option-sub">{opt.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConversionSettings({ value, onChange }: Props) {
  const t = useTranslations("converter.settings");

  return (
    <div className="settings-card">
      <OptionGroup
        label={t("paperSize.label")}
        options={[
          { value: "original" as const, label: t("paperSize.original"), sub: "原始尺寸" },
          { value: "a4" as const, label: t("paperSize.a4"), sub: "A4 标准" },
        ]}
        value={value.paperSize}
        onChange={(v) => onChange({ ...value, paperSize: v })}
      />

      <OptionGroup
        label={t("margins.label")}
        options={[
          { value: "none" as const, label: t("margins.none") },
          { value: "narrow" as const, label: t("margins.narrow") },
          { value: "normal" as const, label: t("margins.normal") },
        ]}
        value={value.margins}
        onChange={(v) => onChange({ ...value, margins: v })}
      />

      <OptionGroup
        label={t("orientation.label")}
        options={[
          { value: "portrait" as const, label: t("orientation.portrait"), sub: "↕" },
          { value: "landscape" as const, label: t("orientation.landscape"), sub: "↔" },
        ]}
        value={value.orientation}
        onChange={(v) => onChange({ ...value, orientation: v })}
      />
    </div>
  );
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ConversionSettings.tsx
git commit -m "refactor: replace radio inputs with card-style option buttons"
```

### Task B2: 重写 ConversionContainer 状态视图

**Files:**
- Modify: `src/components/ConversionContainer.tsx` (替换 selected/converting/error 状态的内联样式为 CSS 类)

- [ ] **Step 1: 更新 selected 状态 — 移除内联样式，使用 CSS 类**

文件列表区域保持已有 `.file-chip` 类，移除 `style={{ maxWidth: 680, marginTop: 20 }}` 等内联样式。
转换为：

```tsx
      {s.status === "selected" && (
        <div className="container" style={{ maxWidth: 680, marginTop: 20 }}>
          <div className="file-list">
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
```

关键改动：原始的 `<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, justifyContent: "center" }}>` → `<div className="file-list">`

- [ ] **Step 2: 更新 converting 状态 — 使用新的 CSS 类**

```tsx
      {s.status === "converting" && (
        <div className="container" style={{ maxWidth: 680, marginTop: 20 }}>
          <div className="file-list">
            {s.files.map((f, idx) => {
              const chipStatus = f.status === "done" ? "done" 
                : f.status === "skipped" ? "skipped"
                : idx === s.currentFileIndex ? "active" 
                : "pending";
              return (
                <span key={f.id} className={`file-chip ${chipStatus}`}>
                  {chipStatus === "done" && <span className="file-status-icon">✓</span>}
                  {chipStatus === "active" && <span className="file-status-spinner" />}
                  {chipStatus === "skipped" && <span className="file-status-icon">✕</span>}
                  {chipStatus === "pending" && <span className="file-status-icon">⏳</span>}
                  {f.name.replace(/\.(heic|heif|HEIC|HEIF)$/, "")}
                </span>
              );
            })}
          </div>

          <div className="progress-info">
            <span className="progress-current">
              {t("progress.fileOfTotal", {
                current: s.currentFileIndex + 1,
                total: s.files.length,
              })}
            </span>
          </div>
          <div className="progress-track accent">
            <div className="progress-bar" style={{ width: `${s.progress}%` }} />
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button
              type="button"
              onClick={conversion.cancel}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--muted)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("button.cancel")}
            </button>
          </div>
        </div>
      )}
```

注意: `ConversionFile.status` 类型为 `"pending" | "done" | "skipped"`，没有 "active"。使用 `idx === s.currentFileIndex` 判断当前正在处理的文件，映射为 `"active"` CSS 类（显示旋转动画）。

- [ ] **Step 3: 更新 error 状态 — 使用新的 CSS 类**

```tsx
      {s.status === "error" && (
        <div className="error-state">
          <div className="error-card">
            <div className="error-icon-circle">!</div>
            <div className="error-title">Conversion Failed</div>
            <div className="error-detail">{s.error}</div>
            <div className="error-actions">
              <button
                type="button"
                onClick={conversion.reset}
                className="btn-ghost"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={conversion.startConversion}
                className="btn-retry"
              >
                ↻ Try Again
              </button>
            </div>
          </div>
        </div>
      )}
```

注意：需要从 useTranslations 获取错误状态的 i18n 文本（从 converter 命名空间）。检查 messages/en.json 中是否有 "Conversion Failed" 等翻译。如果不存在，需要在 en.json 中添加。

查看现有的 en.json，在 "converter" 下没有 "error" 相关段落。需要添加。但根据 spec，我们应该同步更新所有语言文件。

实际上，让我先检查一下 messages 目录有哪些语言文件。

- [ ] **Step 4: 添加错误状态 i18n 翻译**

在 `messages/en.json` 的 `converter` 部分添加：

```json
    "error": {
      "title": "Conversion Failed",
      "detail": "Please try again or use a different browser",
      "back": "← Back",
      "retry": "↻ Try Again"
    }
```

同时更新其他语言文件（es, fr 等）。

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/ConversionContainer.tsx messages/
git commit -m "refactor: replace ConversionContainer inline styles with CSS classes, add error i18n"
```

### Task B3: 重写 PreviewDialog 组件

**Files:**
- Modify: `src/components/PreviewDialog.tsx` (完全重写)
- Depends on: Task A2 (CSS classes for preview)

- [ ] **Step 1: 完全重写 PreviewDialog**

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
    <div className="preview-overlay" onClick={onReset}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-header">
          <span className="preview-header-title">📄 {t("title")}</span>
          <button
            type="button"
            className="preview-header-close"
            onClick={onReset}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="preview-body">
          {/* Desktop thumbnail navigation */}
          <div className="preview-thumbnav">
            {files.map((f, i) => (
              <button
                key={f.id}
                type="button"
                className={`preview-thumbnav-item${i === pageIndex ? " active" : ""}`}
                onClick={() => setPageIndex(i)}
              >
                {f.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.thumbnailUrl} alt={`Page ${i + 1}`} />
                ) : (
                  i + 1
                )}
              </button>
            ))}
          </div>

          {/* Main preview area */}
          <div className="preview-main">
            {current?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.thumbnailUrl}
                alt={`Page ${pageIndex + 1}`}
                className="preview-image"
              />
            ) : (
              <span className="preview-placeholder">
                {t("pageOf", { current: pageIndex + 1, total: totalPages })}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="preview-footer">
          <span className="preview-summary">
            ✅ {t("summary", {
              files: files.length,
              pages: totalPages,
              size: formatBytes(pdfSizeBytes),
            })}
            {skippedCount > 0 && (
              <>
                <span style={{ margin: "0 6px", color: "var(--border)" }}>·</span>
                ⚠️ {t("skipped", { count: skippedCount })}
              </>
            )}
          </span>

          <div className="preview-actions">
            <button
              type="button"
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={pageIndex === 0}
              className="btn-secondary"
            >
              ◀ {t("pageOf", { current: pageIndex + 1, total: totalPages })}
            </button>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {files.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: i === pageIndex ? "var(--accent)" : "var(--border)",
                      cursor: "pointer",
                    }}
                    onClick={() => setPageIndex(i)}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))}
              disabled={pageIndex >= totalPages - 1}
              className="btn-secondary"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary"
            >
              ⬇ {t("download")}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="btn-secondary"
            >
              {t("convertMore")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PreviewDialog.tsx
git commit -m "refactor: rewrite PreviewDialog with desktop thumbnail nav + responsive layout"
```

### Task C: 最终验证

**Files:** N/A — 构建 + 运行验证

- [ ] **Step 1: 运行完整构建检查**

Run: `npm run build`
Expected: build succeeds with no errors

- [ ] **Step 2: 启动开发服务器视觉验证**

Run: `npm run dev`
Expected: 开发服务器启动，手动测试以下场景：
- 拖入 HEIC 文件 → 查看设置面板样式（卡片式选择器、选中态）
- 点击 Convert → 查看进度视图（文件状态、渐变进度条、旋转动画）
- 转换完成 → 预览对话框（左侧缩略图导航、大预览图、响应式）
- 调整浏览器宽度至 640px 以下 → 预览对话框移动端布局
- 切换暗色/亮色主题 → 确认 CSS 变量自动适配
