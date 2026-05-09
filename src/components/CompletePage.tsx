// src/components/CompletePage.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ConversionFile } from "@/lib/conversion-types";
import { formatSize, PDF_FILENAME } from "@/lib/conversion-types";
import { saveToDropbox } from "@/lib/dropbox-utils";
import { saveToGoogleDrive } from "@/lib/cloud/google-drive/utils";

interface Props {
  files: ConversionFile[];
  blob: Blob;
  blobType: "pdf" | "zip";
  sizeBytes: number;
  onReset: () => void;
}

export default function CompletePage({
  files,
  blob,
  blobType,
  sizeBytes,
  onReset,
}: Props) {
  const [downloadPinned, setDownloadPinned] = useState(false);
  const [downloadHover, setDownloadHover] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const downloadCloseTimer = useRef<number | undefined>(undefined);
  const t = useTranslations("editor.complete");
  const downloadOpen = downloadHover || downloadPinned;

  const scheduleDownloadClose = () => {
    if (downloadCloseTimer.current !== undefined) clearTimeout(downloadCloseTimer.current);
    downloadCloseTimer.current = window.setTimeout(() => {
      setDownloadHover(false);
      setDownloadPinned(false);
    }, 150);
  };

  const cancelDownloadClose = () => {
    if (downloadCloseTimer.current !== undefined) {
      clearTimeout(downloadCloseTimer.current);
      downloadCloseTimer.current = undefined;
    }
  };

  // Lock body scroll when complete page is open
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

  const [dropboxStatus, setDropboxStatus] = useState<"idle" | "authorizing" | "uploading" | "success" | "error">("idle");
  const [googleDriveStatus, setGoogleDriveStatus] = useState<"idle" | "authorizing" | "uploading" | "success" | "error">("idle");

  const filename = blobType === "pdf" ? PDF_FILENAME : "images.zip";
  const succeededFiles = files.filter((f) => f.status === "done");
  const skippedFiles = files.filter((f) => f.status === "skipped");

  const handleDownloadToDevice = useCallback(() => {
    cancelDownloadClose();
    setDownloadPinned(false);
    setDownloadHover(false);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadPinned(false);
    setDownloadHover(false);
  }, [blob, filename]);

  const handleSaveToDropbox = useCallback(async () => {
    cancelDownloadClose();
    setDownloadPinned(false);
    setDownloadHover(false);
    setDropboxStatus("authorizing");
    const ok = await saveToDropbox(blob, filename);
    setDropboxStatus(ok ? "success" : "error");
    if (ok) {
      setTimeout(() => setDropboxStatus("idle"), 3000);
    }
  }, [blob, filename]);

  const handleSaveToGoogleDrive = useCallback(async () => {
    cancelDownloadClose();
    setDownloadPinned(false);
    setDownloadHover(false);
    setGoogleDriveStatus("authorizing");
    const ok = await saveToGoogleDrive(blob, filename);
    setGoogleDriveStatus(ok ? "success" : "error");
    if (ok) {
      setTimeout(() => setGoogleDriveStatus("idle"), 3000);
    }
  }, [blob, filename]);

  return (
    <div className="complete-page">
      <div className="complete-page-content">
        <div className="complete-icon-circle">&#10003;</div>
        <h2 className="complete-title">{t("title")}</h2>

        {/* File results */}
        <div className="complete-file-list">
          {succeededFiles.map((f) => (
            <div key={f.id} className="complete-file-row done">
              <span className="complete-file-icon">&#10003;</span>
              <span className="complete-file-name">{f.name}</span>
              <span className="complete-file-size">{formatSize(f.size)}</span>
            </div>
          ))}
          {skippedFiles.map((f) => (
            <div key={f.id} className="complete-file-row skipped">
              <span className="complete-file-icon">&#10005;</span>
              <span className="complete-file-name">{f.name}</span>
              <span className="complete-file-error">{f.error || t("skipped")}</span>
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
          <div
            className="split-btn-wrap"
            ref={dropdownRef}
            onMouseEnter={() => { cancelDownloadClose(); setDownloadHover(true); }}
            onMouseLeave={scheduleDownloadClose}
          >
            <button
              className="split-btn-main"
              onClick={handleDownloadToDevice}
              type="button"
            >
              {t("download")}
            </button>
            <button
              className="split-btn-arrow"
              onClick={() => setDownloadPinned((v) => !v)}
              type="button"
              aria-label="More download options"
            >
              &#9662;
            </button>
            {downloadOpen && (
              <div className="split-btn-dropdown">
                <button onClick={handleDownloadToDevice} type="button">
                  {t("toDevice")}
                </button>
                <button onClick={handleSaveToDropbox} type="button">
                  {t("toDropbox")}
                </button>
                <button onClick={handleSaveToGoogleDrive} type="button">
                  {t("toGoogleDrive")}
                </button>
              </div>
            )}
          </div>

          <button className="complete-start-over" onClick={onReset} type="button">
            &larr; {t("startOver")}
          </button>
        </div>

        {dropboxStatus === "authorizing" && (
          <p className="dropbox-status" style={{ color: "var(--muted)", marginTop: 16, fontSize: 13 }}>
            Authorizing Dropbox...
          </p>
        )}
        {dropboxStatus === "success" && (
          <p className="dropbox-status" style={{ color: "var(--accent)", marginTop: 16, fontSize: 13 }}>
            ✓ Saved to Dropbox!
          </p>
        )}
        {dropboxStatus === "error" && (
          <p className="dropbox-status" style={{ color: "#e44", marginTop: 16, fontSize: 13 }}>
            ✕ Failed to save to Dropbox
          </p>
        )}
        {googleDriveStatus === "authorizing" && (
          <p className="dropbox-status" style={{ color: "var(--muted)", marginTop: 16, fontSize: 13 }}>
            Authorizing Google Drive...
          </p>
        )}
        {googleDriveStatus === "success" && (
          <p className="dropbox-status" style={{ color: "var(--accent)", marginTop: 16, fontSize: 13 }}>
            ✓ Saved to Google Drive!
          </p>
        )}
        {googleDriveStatus === "error" && (
          <p className="dropbox-status" style={{ color: "#e44", marginTop: 16, fontSize: 13 }}>
            ✕ Failed to save to Google Drive
          </p>
        )}
      </div>
    </div>
  );
}
