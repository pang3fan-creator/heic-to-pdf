// src/components/EditorOverlay.tsx

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  type ConversionFile,
  type ConversionSettings,
  formatSize,
  resolveOrientation,
} from "@/lib/conversion-types";
import { calculateLayout } from "@/lib/pdf-generator";
import PreviewModal from "./PreviewModal";

interface Props {
  files: ConversionFile[];
  settings: ConversionSettings;
  onClose: () => void;
  onConvert: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onSettingsChange: (settings: ConversionSettings) => void;
}

type SortMode = "default" | "asc" | "desc";
type ThumbSize = 0 | 1 | 2; // 0 = small, 1 = medium, 2 = large

const PAPER_SIZES: { value: ConversionSettings["paperSize"]; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "a4", label: "A4 (210 × 297 mm)" },
  { value: "letter", label: "Letter (216 × 279 mm)" },
  { value: "legal", label: "Legal (216 × 356 mm)" },
  { value: "a3", label: "A3 (297 × 420 mm)" },
];

const ORIENTATIONS: { value: ConversionSettings["orientation"]; label: string }[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "auto", label: "Auto (match original)" },
];

const MARGINS: { value: ConversionSettings["margins"]; label: string }[] = [
  { value: "none", label: "None (0 mm)" },
  { value: "narrow", label: "Narrow (6 mm)" },
  { value: "normal", label: "Normal (12 mm)" },
  { value: "wide", label: "Wide (24 mm)" },
];

// ── ThumbnailCell ──────────────────────────────────────────
// Renders a single thumbnail as a mini PDF page preview using Canvas.
// Re-renders when settings change to reflect the latest layout.

function drawThumbPage(
  canvas: HTMLCanvasElement,
  img: ImageBitmap,
  imgWidth: number,
  imgHeight: number,
  settings: ConversionSettings,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Use the canvas's own display size (set by CSS width/height: 100%)
  let displayW = canvas.clientWidth;
  let displayH = canvas.clientHeight;
  if (displayW === 0 || displayH === 0) {
    const parent = canvas.parentElement;
    if (parent) {
      displayW = parent.clientWidth;
      displayH = parent.clientHeight;
    }
    if (displayW === 0 || displayH === 0) return;
  }

  // Resolve auto orientation
  const resolved = resolveOrientation(imgWidth, imgHeight, settings);
  const layout = calculateLayout(imgWidth, imgHeight, {
    ...settings,
    orientation: resolved,
  });

  // Set pixel buffer to match display size (× devicePixelRatio for retina)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;
  ctx.scale(dpr, dpr);

  // Scale page to fit within canvas with padding
  const pad = 6;
  const availW = displayW - pad * 2;
  const availH = displayH - pad * 2;
  const fitScale = Math.min(
    availW / layout.pageWidth,
    availH / layout.pageHeight,
    1,
  );

  const pageW = Math.round(layout.pageWidth * fitScale);
  const pageH = Math.round(layout.pageHeight * fitScale);
  const pageX = Math.round((displayW - pageW) / 2);
  const pageY = Math.round((displayH - pageH) / 2);

  // Draw white page background (centered)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pageX, pageY, pageW, pageH);

  // Draw image at calculated position within the page
  ctx.drawImage(
    img,
    pageX + Math.round(layout.x * fitScale),
    pageY + Math.round(layout.y * fitScale),
    Math.round(layout.drawWidth * fitScale),
    Math.round(layout.drawHeight * fitScale),
  );
}

function ThumbnailCell({
  file,
  index,
  settings,
  onClick,
}: {
  file: ConversionFile;
  index: number;
  settings: ConversionSettings;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  // 1. Create ImageBitmap from stored RGBA data once
  useEffect(() => {
    if (
      !file.thumbnailData ||
      !file.thumbnailDataWidth ||
      !file.thumbnailDataHeight
    )
      return;

    let cancelled = false;

    const imageData = new ImageData(
      new Uint8ClampedArray(file.thumbnailData),
      file.thumbnailDataWidth,
      file.thumbnailDataHeight,
    );

    createImageBitmap(imageData).then((bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      // Close previous bitmap if any
      bitmapRef.current?.close();
      bitmapRef.current = bitmap;
      // Redraw with the new bitmap
      const canvas = canvasRef.current;
      if (!canvas) return;
      requestAnimationFrame(() => {
        drawThumbPage(
          canvas,
          bitmap,
          file.thumbnailDataWidth!,
          file.thumbnailDataHeight!,
          settings,
        );
      });
    });

    return () => {
      cancelled = true;
    };
    // Only re-run when file data changes (not when settings change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.thumbnailData, file.thumbnailDataWidth, file.thumbnailDataHeight]);

  // 2. Redraw when settings change (bitmap is already loaded in ref)
  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (
      !canvas ||
      !bitmap ||
      !file.thumbnailDataWidth ||
      !file.thumbnailDataHeight
    )
      return;
    requestAnimationFrame(() => {
      drawThumbPage(
        canvas,
        bitmap,
        file.thumbnailDataWidth!,
        file.thumbnailDataHeight!,
        settings,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return (
    <div
      className="thumb-item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
    >
      <div className="thumb-preview">
        <span className="thumb-order">{index + 1}</span>
        {file.thumbnailData ? (
          <canvas ref={canvasRef} className="thumb-canvas" />
        ) : (
          <div className="placeholder-icon" style={{ display: "flex" }}>
            <div className="thumb-spinner" />
          </div>
        )}
      </div>
      <div className="thumb-info">
        <div className="thumb-name" title={file.name}>
          {file.name.replace(/\.(heic|HEIC|heif|HEIF)$/, "")}
        </div>
        <div className="thumb-size">{formatSize(file.size)}</div>
      </div>
    </div>
  );
}

// ── EditorOverlay ──────────────────────────────────────────

export default function EditorOverlay({
  files,
  settings,
  onClose,
  onConvert,
  onAddFiles,
  onSettingsChange,
}: Props) {
  const t = useTranslations("editor");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [thumbSize, setThumbSize] = useState<ThumbSize>(1);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewFile = useMemo(
    () =>
      previewFileId ? files.find((f) => f.id === previewFileId) ?? null : null,
    [previewFileId, files],
  );

  const sortedFiles = useMemo(() => {
    const arr = [...files];
    if (sortMode === "asc") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "desc") {
      arr.sort((a, b) => b.name.localeCompare(a.name));
    }
    return arr;
  }, [files, sortMode]);

  const handleAddClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onAddFiles(e.target.files);
      }
      e.target.value = "";
    },
    [onAddFiles],
  );

  const handleConvert = useCallback(() => {
    onConvert();
  }, [onConvert]);

  return (
    <div className="editor-overlay active" id="editorOverlay">
      {/* Header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <button
            className="editor-back-btn"
            onClick={onClose}
            aria-label="Back to homepage"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>
          <span className="editor-title">{t("title")}</span>
        </div>
        <div className="editor-header-right">
          <button className="editor-add-btn" onClick={handleAddClick} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {t("addPhotos")}
          </button>
          <button className="editor-convert-btn" onClick={handleConvert} type="button">
            {t("convertBtn")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="editor-body">
        {/* Main area */}
        <div className="editor-main">
          <div className="editor-main-toolbar">
            <div className="editor-main-toolbar-left">
              <span className="sort-label">{t("sortLabel")}</span>
              <div className="sort-btn-group" id="sortBtnGroup">
                <button
                  type="button"
                  className={`sort-btn${sortMode === "default" ? " active" : ""}`}
                  onClick={() => setSortMode("default")}
                >
                  {t("sortDefault")}
                </button>
                <button
                  type="button"
                  className={`sort-btn${sortMode === "asc" ? " active" : ""}`}
                  onClick={() => setSortMode("asc")}
                >
                  {t("sortAsc")}
                </button>
                <button
                  type="button"
                  className={`sort-btn${sortMode === "desc" ? " active" : ""}`}
                  onClick={() => setSortMode("desc")}
                >
                  {t("sortDesc")}
                </button>
              </div>
            </div>
            <div className="editor-main-toolbar-right">
              <span className="size-label">{t("sizeLabel")}</span>
              <div className="size-slider-wrap">
                <span className={`size-icon${thumbSize === 0 ? " active" : ""}`}>▫</span>
                <input
                  type="range"
                  className="size-slider"
                  min={0}
                  max={2}
                  value={thumbSize}
                  step={1}
                  onChange={(e) => setThumbSize(Number(e.target.value) as ThumbSize)}
                />
                <span className={`size-icon${thumbSize === 2 ? " active" : ""}`}>▪</span>
              </div>
            </div>
          </div>

          <div className="thumb-grid-wrap">
            <div className={`thumb-grid${thumbSize === 0 ? " size-small" : ""}${thumbSize === 2 ? " size-large" : ""}`}>
              {sortedFiles.length === 0 ? (
                <div className="thumb-empty">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="4" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M24 16V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M16 24L24 16L32 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="37" x2="36" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <p>{t("empty")}</p>
                </div>
              ) : (
                sortedFiles.map((f, i) => (
                  <ThumbnailCell
                    key={f.id}
                    file={f}
                    index={i}
                    settings={settings}
                    onClick={() => setPreviewFileId(f.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Preview modal overlays the main content area */}
          {previewFile && (
            <PreviewModal
              file={previewFile}
              files={sortedFiles}
              settings={settings}
              onClose={() => setPreviewFileId(null)}
              onNavigate={(fileId) => setPreviewFileId(fileId)}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="editor-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-section-title">{t("sidebar.pageSetup")}</div>
            <div className="sidebar-field">
              <div className="sidebar-field-label">{t("sidebar.paperSize")}</div>
              <select
                className="sidebar-select"
                value={settings.paperSize}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    paperSize: e.target.value as ConversionSettings["paperSize"],
                  })
                }
              >
                {PAPER_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sidebar-field">
              <div className="sidebar-field-label">{t("sidebar.orientation")}</div>
              <select
                className="sidebar-select"
                value={settings.orientation}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    orientation: e.target.value as ConversionSettings["orientation"],
                  })
                }
              >
                {ORIENTATIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sidebar-field">
              <div className="sidebar-field-label">{t("sidebar.margin")}</div>
              <select
                className="sidebar-select"
                value={settings.margins}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    margins: e.target.value as ConversionSettings["margins"],
                  })
                }
              >
                {MARGINS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-file-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span>
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for add more */}
      <input
        ref={inputRef}
        type="file"
        accept=".heic,.HEIC,.heif,.HEIF"
        multiple
        style={{ display: "none" }}
        onChange={handleInputChange}
      />
    </div>
  );
}
