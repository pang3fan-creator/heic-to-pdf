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
