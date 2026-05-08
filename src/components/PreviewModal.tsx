// src/components/PreviewModal.tsx

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  type ConversionFile,
  type ConversionSettings,
} from "@/lib/conversion-types";
import { drawPagePreview } from "@/lib/preview-renderer";

// Viewport for the large preview modal (CSS pixels)
const PREVIEW_VIEWPORT = { width: 500, height: 700 };

interface Props {
  file: ConversionFile;
  files: ConversionFile[];
  settings: ConversionSettings;
  onClose: () => void;
  onNavigate: (fileId: string) => void;
}

export default function PreviewModal({
  file,
  files,
  settings,
  onClose,
  onNavigate,
}: Props) {
  const t = useTranslations("editor");
  const pt = useTranslations("editor.preview");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const currentIndex = files.findIndex((f) => f.id === file.id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile =
    currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  // Create ImageBitmap from preview RGBA data once per file
  useEffect(() => {
    if (
      !file.previewData ||
      !file.previewDataWidth ||
      !file.previewDataHeight
    )
      return;

    let cancelled = false;

    const imageData = new ImageData(
      new Uint8ClampedArray(file.previewData),
      file.previewDataWidth,
      file.previewDataHeight,
    );

    createImageBitmap(imageData).then((bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      bitmapRef.current?.close();
      bitmapRef.current = bitmap;

      // Draw immediately
      const canvas = canvasRef.current;
      if (!canvas) return;
      drawPagePreview(
        canvas,
        bitmap,
        file.previewDataWidth!,
        file.previewDataHeight!,
        settings,
        PREVIEW_VIEWPORT,
      );
    });

    return () => {
      cancelled = true;
    };
    // Only re-run when file data changes (not settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.previewData, file.previewDataWidth, file.previewDataHeight]);

  // Redraw when settings change (bitmap is cached in ref)
  useEffect(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (
      !canvas ||
      !bitmap ||
      !file.previewDataWidth ||
      !file.previewDataHeight
    )
      return;
    drawPagePreview(
      canvas,
      bitmap,
      file.previewDataWidth,
      file.previewDataHeight,
      settings,
      PREVIEW_VIEWPORT,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && prevFile) {
        onNavigate(prevFile.id);
      } else if (e.key === "ArrowRight" && nextFile) {
        onNavigate(nextFile.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, prevFile, nextFile]);

  const handlePrev = useCallback(() => {
    if (prevFile) onNavigate(prevFile.id);
  }, [prevFile, onNavigate]);

  const handleNext = useCallback(() => {
    if (nextFile) onNavigate(nextFile.id);
  }, [nextFile, onNavigate]);

  const hasPreview = Boolean(
    file.previewData && file.previewDataWidth && file.previewDataHeight,
  );

  return (
    <div className="preview-overlay" role="dialog" aria-label={pt("close")} onClick={onClose}>
      {/* Header */}
      <div className="preview-header" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header-left">
          <span className="preview-filename">{file.name}</span>
          <span className="preview-pagination">
            {pt("pageOf", { current: currentIndex + 1, total: files.length })}
          </span>
        </div>
        <button
          className="preview-close-btn"
          onClick={onClose}
          aria-label={pt("close")}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="preview-body">
        {prevFile && (
          <button
            className="preview-nav-btn"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            aria-label={pt("prev")}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div className="preview-content">
          {!hasPreview ? (
            <div className="preview-loading" onClick={(e) => e.stopPropagation()}>
              <div className="preview-spinner" />
              <span>{pt("decoding")}</span>
            </div>
          ) : (
            <canvas ref={canvasRef} className="preview-canvas" onClick={(e) => e.stopPropagation()} />
          )}
        </div>

        {nextFile && (
          <button
            className="preview-nav-btn"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            aria-label={pt("next")}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="preview-footer" onClick={(e) => e.stopPropagation()}>
        <span>{t("sidebar.paperSize")}: {settings.paperSize}</span>
        <span>{t("sidebar.orientation")}: {settings.orientation}</span>
        <span>{t("sidebar.margin")}: {settings.margins}</span>
      </div>
    </div>
  );
}
