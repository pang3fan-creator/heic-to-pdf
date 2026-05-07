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
