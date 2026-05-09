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
  onRemoveFile: (fileId: string) => void;
  onSettingsChange: (settings: ConversionSettings) => void;
}

type SortMode = "default" | "asc" | "desc";
type ThumbSize = 0 | 1 | 2 | 3 | 4; // 0=小, 1=次小, 2=中, 3=次大, 4=大

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
  onRemove,
  className,
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  file: ConversionFile;
  index: number;
  settings: ConversionSettings;
  onClick: () => void;
  onRemove?: (fileId: string) => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
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
      bitmapRef.current = bitmap;
      // Redraw with the new bitmap
      const canvas = canvasRef.current;
      if (!canvas) return;
      requestAnimationFrame(() => {
        if (bitmapRef.current !== bitmap) return;
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
      if (bitmapRef.current !== bitmap) return;
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
      className={`thumb-item${className ? " " + className : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="thumb-preview">
        <span className="thumb-order">
          <span className="thumb-order-num">{index + 1}</span>
          <span
            className="thumb-order-x"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(file.id);
            }}
          >✕</span>
        </span>
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
          {file.name.replace(/\.(heic|heif|HEIC|HEIF|jpg|jpeg|JPG|JPEG|png|PNG|webp|WEBP)$/, "")}
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
  onRemoveFile,
  onSettingsChange,
}: Props) {
  const t = useTranslations("editor");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [thumbSize, setThumbSize] = useState<ThumbSize>(2);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[] | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbGridWrapRef = useRef<HTMLDivElement>(null);

  const previewFile = useMemo(
    () =>
      previewFileId ? files.find((f) => f.id === previewFileId) ?? null : null,
    [previewFileId, files],
  );

  const sortedFiles = useMemo(() => {
    let arr = [...files];

    if (sortMode === "asc") {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "desc") {
      arr.sort((a, b) => b.name.localeCompare(a.name));
    } else if (customOrder) {
      const idxMap = new Map(customOrder.map((id, i) => [id, i]));
      arr.sort(
        (a, b) =>
          (idxMap.get(a.id) ?? Infinity) - (idxMap.get(b.id) ?? Infinity),
      );
    }

    return arr;
  }, [files, sortMode, customOrder]);

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

  const [addPinned, setAddPinned] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const addCloseTimer = useRef<number | undefined>(undefined);
  const addOpen = addHover || addPinned;

  const scheduleAddClose = () => {
    if (addCloseTimer.current !== undefined) clearTimeout(addCloseTimer.current);
    addCloseTimer.current = window.setTimeout(() => {
      setAddHover(false);
      setAddPinned(false);
    }, 150);
  };

  const cancelAddClose = () => {
    if (addCloseTimer.current !== undefined) {
      clearTimeout(addCloseTimer.current);
      addCloseTimer.current = undefined;
    }
  };

  const handleAddFromDropbox = useCallback(async () => {
    cancelAddClose();
    setAddPinned(false);
    setAddHover(false);
    try {
      const { pickFromDropbox } = await import("@/lib/dropbox-utils");
      const files = await pickFromDropbox();
      if (files.length > 0) {
        onAddFiles(files);
      }
    } catch {
      // Dropbox SDK not configured or user cancelled
    }
  }, [onAddFiles]);

  const handleAddFromGoogleDrive = useCallback(async () => {
    cancelAddClose();
    setAddPinned(false);
    setAddHover(false);
    try {
      const { pickFromGoogleDrive } = await import("@/lib/cloud/google-drive/utils");
      const files = await pickFromGoogleDrive();
      if (files.length > 0) {
        onAddFiles(files);
      }
    } catch {
      // silently ignore
    }
  }, [onAddFiles]);

  const handleAddFromOneDrive = useCallback(async () => {
    cancelAddClose();
    setAddPinned(false);
    setAddHover(false);
    try {
      const { pickFromOneDrive } = await import("@/lib/cloud/onedrive/utils");
      const files = await pickFromOneDrive();
      if (files.length > 0) {
        onAddFiles(files);
      }
    } catch {
      // silently ignore
    }
  }, [onAddFiles]);

  // Ctrl/Cmd + scroll wheel to zoom thumbnail size
  useEffect(() => {
    const el = thumbGridWrapRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setThumbSize((prev) => {
          if (e.deltaY < 0) return Math.min(4, prev + 1) as ThumbSize;
          if (e.deltaY > 0) return Math.max(0, prev - 1) as ThumbSize;
          return prev;
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Lock body scroll when editor is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

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
          <div
            className="split-btn-wrap"
            ref={addRef}
            onMouseEnter={() => { cancelAddClose(); setAddHover(true); }}
            onMouseLeave={scheduleAddClose}
          >
            <button className="editor-add-btn split-btn-editor" onClick={handleAddClick} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              {t("addPhotos")}
            </button>
            <button
              className="split-btn-editor-arrow"
              onClick={() => setAddPinned((v) => !v)}
              type="button"
              aria-label="More options"
            >
              ▾
            </button>
            {addOpen && (
              <div className="split-btn-dropdown">
                <button onClick={() => { setAddPinned(false); setAddHover(false); handleAddClick(); }} type="button">
                  {t("fromDevice")}
                </button>
                <button onClick={handleAddFromDropbox} type="button">
                  {t("fromDropbox")}
                </button>
                <button onClick={handleAddFromGoogleDrive} type="button">
                  {t("fromGoogleDrive")}
                </button>
                <button onClick={handleAddFromOneDrive} type="button">
                  {t("fromOneDrive")}
                </button>
              </div>
            )}
          </div>
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
          {/* Floating tool panel — sort + size */}
          <div className="editor-floating-tools">
            <div className="sort-btn-group-vertical">
              <button
                type="button"
                className={`sort-btn-vert${sortMode === "default" ? " active" : ""}`}
                onClick={() => { setSortMode("default"); setCustomOrder(null); }}
                title={t("sortDefault")}
              >↕</button>
              <button
                type="button"
                className={`sort-btn-vert${sortMode === "asc" ? " active" : ""}`}
                onClick={() => { setSortMode("asc"); setCustomOrder(null); }}
                title={t("sortAsc")}
              >↑</button>
              <button
                type="button"
                className={`sort-btn-vert${sortMode === "desc" ? " active" : ""}`}
                onClick={() => { setSortMode("desc"); setCustomOrder(null); }}
                title={t("sortDesc")}
              >↓</button>
            </div>
            <div className="size-slider-wrap">
              <button
                type="button"
                className={`size-icon${thumbSize === 4 ? " active" : ""}`}
                onClick={() => setThumbSize(Math.min(4, thumbSize + 1) as ThumbSize)}
                title={t("sizeIncrease")}
              >+</button>
              <input
                type="range"
                className="size-slider-vertical"
                style={{
                  background: `linear-gradient(to top, var(--accent), var(--accent) ${(thumbSize / 4) * 100}%, var(--border) ${(thumbSize / 4) * 100}%, var(--border) 100%)`,
                }}
                min={0}
                max={4}
                value={thumbSize}
                step={1}
                onChange={(e) => setThumbSize(Number(e.target.value) as ThumbSize)}
                title={t("sizeDrag")}
              />
              <button
                type="button"
                className={`size-icon${thumbSize === 0 ? " active" : ""}`}
                onClick={() => setThumbSize(Math.max(0, thumbSize - 1) as ThumbSize)}
                title={t("sizeDecrease")}
              >−</button>
            </div>
          </div>
          <div ref={thumbGridWrapRef} className="thumb-grid-wrap">
            <div className={`thumb-grid size-${thumbSize}`}>
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
                    onRemove={onRemoveFile}
                    draggable
                    className={dragOverId === f.id ? "drag-over" : ""}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", f.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverId(f.id);
                    }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const srcId = e.dataTransfer.getData("text/plain");
                      if (!srcId || srcId === f.id) return;
                      const ids = sortedFiles.map((x) => x.id);
                      const fromIdx = ids.indexOf(srcId);
                      const toIdx = ids.indexOf(f.id);
                      if (fromIdx === -1 || toIdx === -1) return;
                      const reordered = [...ids];
                      reordered.splice(fromIdx, 1);
                      reordered.splice(toIdx, 0, srcId);
                      setCustomOrder(reordered);
                      setSortMode("default");
                      setDragOverId(null);
                    }}
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
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-file-count">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
              <span>
                {settings.merge
                  ? t("fileCount", { count: files.length })
                  : `${files.length} files → ${files.length} PDFs in .zip`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input for add more */}
      <input
        ref={inputRef}
        type="file"
        accept=".heic,.HEIC,.heif,.HEIF,.jpg,.jpeg,.JPEG,.JPG,.png,.PNG,.webp,.WEBP"
        multiple
        style={{ display: "none" }}
        onChange={handleInputChange}
      />
    </div>
  );
}
