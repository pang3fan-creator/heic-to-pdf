// src/components/CompletePage.tsx

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ConversionFile } from "@/lib/conversion-types";
import { formatSize, PDF_FILENAME } from "@/lib/conversion-types";
import { saveToDropbox } from "@/lib/dropbox-utils";
import { saveToGoogleDrive } from "@/lib/cloud/google-drive/utils";
import { HiOutlineComputerDesktop } from "react-icons/hi2";
import { FaDropbox } from "react-icons/fa";
import { SiGoogledrive } from "react-icons/si";

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
  const [downloadHover, setDownloadHover] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const downloadCloseTimer = useRef<number | undefined>(undefined);
  const t = useTranslations("editor.complete");
  const downloadOpen = downloadHover;

  const scheduleDownloadClose = () => {
    if (downloadCloseTimer.current !== undefined) clearTimeout(downloadCloseTimer.current);
    downloadCloseTimer.current = window.setTimeout(() => {
      setDownloadHover(false);
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

  type CloudStatus = {
    provider: "dropbox" | "google-drive" | null;
    status: "idle" | "authorizing" | "uploading" | "success" | "error";
  };

  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ provider: null, status: "idle" });

  const filename = blobType === "pdf" ? PDF_FILENAME : "images.zip";
  const succeededFiles = files.filter((f) => f.status === "done");
  const skippedFiles = files.filter((f) => f.status === "skipped");

  const handleDownloadToDevice = useCallback(() => {
    cancelDownloadClose();
    setDownloadHover(false);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadHover(false);
  }, [blob, filename]);

  const handleSaveToDropbox = useCallback(async () => {
    cancelDownloadClose();
    setDownloadHover(false);
    setCloudStatus({ provider: "dropbox", status: "authorizing" });
    const ok = await saveToDropbox(blob, filename);
    setCloudStatus({ provider: "dropbox", status: ok ? "success" : "error" });
    if (ok) setTimeout(() => setCloudStatus({ provider: null, status: "idle" }), 3000);
  }, [blob, filename]);

  const handleSaveToGoogleDrive = useCallback(async () => {
    cancelDownloadClose();
    setDownloadHover(false);
    setCloudStatus({ provider: "google-drive", status: "authorizing" });
    const ok = await saveToGoogleDrive(blob, filename);
    setCloudStatus({ provider: "google-drive", status: ok ? "success" : "error" });
    if (ok) setTimeout(() => setCloudStatus({ provider: null, status: "idle" }), 3000);
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
            {downloadOpen && (
              <div className="split-btn-dropdown">
                <button onClick={handleDownloadToDevice} type="button">
                  <HiOutlineComputerDesktop size={28} aria-hidden="true" />
                  {t("toDevice")}
                </button>
                <hr aria-hidden="true" />
                <button onClick={handleSaveToDropbox} type="button">
                  <FaDropbox size={28} aria-hidden="true" />
                  {t("toDropbox")}
                </button>
                <hr aria-hidden="true" />
                <button onClick={handleSaveToGoogleDrive} type="button">
                  <SiGoogledrive size={28} aria-hidden="true" />
                  {t("toGoogleDrive")}
                </button>
              </div>
            )}
          </div>

          <button className="complete-start-over" onClick={onReset} type="button">
            &larr; {t("startOver")}
          </button>
        </div>

        {cloudStatus.status === "authorizing" && (
          <p className="dropbox-status" style={{ color: "var(--muted)", marginTop: 16, fontSize: 13 }}>
            {cloudStatus.provider === "dropbox" ? "Authorizing Dropbox..." : "Authorizing Google Drive..."}
          </p>
        )}
        {cloudStatus.status === "success" && (
          <p className="dropbox-status" style={{ color: "var(--accent)", marginTop: 16, fontSize: 13 }}>
            ✓ Saved to {cloudStatus.provider === "dropbox" ? "Dropbox" : "Google Drive"}!
          </p>
        )}
        {cloudStatus.status === "error" && (
          <p className="dropbox-status" style={{ color: "#e44", marginTop: 16, fontSize: 13 }}>
            ✕ Failed to save to {cloudStatus.provider === "dropbox" ? "Dropbox" : "Google Drive"}
          </p>
        )}
      </div>
    </div>
  );
}
