"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_FILE_SIZE, getFileType, formatSize, PDF_FILENAME } from "@/lib/conversion-types";
import { FaDropbox } from "react-icons/fa";
import { SiGoogledrive } from "react-icons/si";
import { HiOutlineComputerDesktop } from "react-icons/hi2";
import { saveToDropbox } from "@/lib/dropbox-utils";
import { saveToGoogleDrive } from "@/lib/cloud/google-drive/utils";
import type { ConversionFile } from "@/lib/conversion-types";

interface Props {
  onFilesSelected: (files: FileList | File[]) => void;
  isConverting?: boolean;
  progress?: number;
  files?: ConversionFile[];
  currentFileIndex?: number;
  onCancel?: () => void;
  blob?: Blob;
  blobType?: "pdf" | "zip";
  sizeBytes?: number;
  onReset?: () => void;
}

export default function DropZone({
  onFilesSelected,
  isConverting,
  progress,
  files,
  currentFileIndex,
  onCancel,
  blob,
  blobType,
  sizeBytes,
  onReset,
}: Props) {
  const t = useTranslations("hero.dropzone");
  const inputRef = useRef<HTMLInputElement>(null);
  const [browseHover, setBrowseHover] = useState(false);
  const browseRef = useRef<HTMLDivElement>(null);
  const browseCloseTimer = useRef<number | undefined>(undefined);
  const browseOpen = browseHover;

  const scheduleBrowseClose = () => {
    if (browseCloseTimer.current !== undefined) clearTimeout(browseCloseTimer.current);
    browseCloseTimer.current = window.setTimeout(() => {
      setBrowseHover(false);
    }, 150);
  };

  const cancelBrowseClose = () => {
    if (browseCloseTimer.current !== undefined) {
      clearTimeout(browseCloseTimer.current);
      browseCloseTimer.current = undefined;
    }
  };

  const handleFromDropbox = useCallback(async () => {
    cancelBrowseClose();
    setBrowseHover(false);
    try {
      const { pickFromDropbox } = await import("@/lib/dropbox-utils");
      const files = await pickFromDropbox();
      if (files.length > 0) {
        onFilesSelected(files);
      }
    } catch {
      // Dropbox SDK not configured or user cancelled — silently ignore
    }
  }, [onFilesSelected]);

  const handleFromGoogleDrive = useCallback(async () => {
    cancelBrowseClose();
    setBrowseHover(false);
    try {
      const { pickFromGoogleDrive } = await import("@/lib/cloud/google-drive/utils");
      const files = await pickFromGoogleDrive();
      if (files.length > 0) {
        onFilesSelected(files);
      }
    } catch {
      // silently ignore
    }
  }, [onFilesSelected]);

  // Detect return from Google OAuth redirect — auto-open Picker
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("gauth=1")) {
      window.history.replaceState(null, "", "/");
      handleFromGoogleDrive();
    }
  }, [handleFromGoogleDrive]);

  const tComplete = useTranslations("editor.complete");

  // ── Complete state ──
  const [downloadHover, setDownloadHover] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const downloadCloseTimer = useRef<number | undefined>(undefined);
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

  type CloudStatus = {
    provider: "dropbox" | "google-drive" | null;
    status: "idle" | "authorizing" | "uploading" | "success" | "error";
  };

  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ provider: null, status: "idle" });

  const completeFilename = blobType === "pdf" ? PDF_FILENAME : "images.zip";
  const succeededFiles = files ? files.filter((f) => f.status === "done") : [];
  const skippedFiles = files ? files.filter((f) => f.status === "skipped") : [];

  const handleDownloadToDevice = useCallback(() => {
    if (!blob) return;
    cancelDownloadClose();
    setDownloadHover(false);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = completeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadHover(false);
  }, [blob, completeFilename]);

  const handleSaveToDropbox = useCallback(async () => {
    if (!blob) return;
    cancelDownloadClose();
    setDownloadHover(false);
    setCloudStatus({ provider: "dropbox", status: "authorizing" });
    const ok = await saveToDropbox(blob, completeFilename);
    setCloudStatus({ provider: "dropbox", status: ok ? "success" : "error" });
    if (ok) setTimeout(() => setCloudStatus({ provider: null, status: "idle" }), 3000);
  }, [blob, completeFilename]);

  const handleSaveToGoogleDrive = useCallback(async () => {
    if (!blob) return;
    cancelDownloadClose();
    setDownloadHover(false);
    setCloudStatus({ provider: "google-drive", status: "authorizing" });
    const ok = await saveToGoogleDrive(blob, completeFilename);
    setCloudStatus({ provider: "google-drive", status: ok ? "success" : "error" });
    if (ok) setTimeout(() => setCloudStatus({ provider: null, status: "idle" }), 3000);
  }, [blob, completeFilename]);

  const showProcessing = isConverting;

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const filtered = Array.from(fileList).filter(
        (f) => getFileType(f) !== "unsupported" && f.size <= MAX_FILE_SIZE,
      );
      if (filtered.length > 0) {
        onFilesSelected(filtered);
      }
    },
    [onFilesSelected],
  );

  const onBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles],
  );

  return (
    <div
      className={`drop-zone${blob ? " complete-mode" : ""}`}
      id="dropZone"
      onDragOver={(e) => {
        if (blob) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("dragover");
      }}
      onDragLeave={(e) => {
        if (blob) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
      }}
      onDrop={(e) => {
        if (blob) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
      onClick={(e) => {
        if (blob) return;
        if ((e.target as HTMLElement).closest('.split-btn-wrap')) return;
        onBrowse();
      }}
    >
      {blob ? (
        <>
          <div className="complete-icon-circle">&#10003;</div>
          <h2 className="complete-title">{tComplete("title")}</h2>

          {/* File results */}
          {(succeededFiles.length > 0 || skippedFiles.length > 0) && (
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
                  <span className="complete-file-error">{f.error || tComplete("skipped")}</span>
                </div>
              ))}
            </div>
          )}

          {/* Output info */}
          <div className="complete-output-info">
            <span className="complete-output-name">{completeFilename}</span>
            <span className="complete-output-size">{formatSize(sizeBytes ?? 0)}</span>
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
                {tComplete("download")}
              </button>
              {downloadOpen && (
                <div className="split-btn-dropdown">
                  <button onClick={handleDownloadToDevice} type="button">
                    <HiOutlineComputerDesktop size={28} aria-hidden="true" />
                    {tComplete("toDevice")}
                  </button>
                  <hr aria-hidden="true" />
                  <button onClick={handleSaveToDropbox} type="button">
                    <FaDropbox size={28} aria-hidden="true" />
                    {tComplete("toDropbox")}
                  </button>
                  <hr aria-hidden="true" />
                  <button onClick={handleSaveToGoogleDrive} type="button">
                    <SiGoogledrive size={28} aria-hidden="true" />
                    {tComplete("toGoogleDrive")}
                  </button>
                </div>
              )}
            </div>

            {onReset && (
              <button className="complete-start-over" onClick={onReset} type="button">
                {tComplete("startOver")}
              </button>
            )}
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
        </>
      ) : showProcessing && files ? (
        <>
          <div className="file-list">
            {files.slice(0, 5).map((f, idx) => {
              const chipStatus =
                f.status === "done"
                  ? "done"
                  : f.status === "skipped"
                    ? "skipped"
                    : idx === currentFileIndex
                      ? "active"
                      : "pending";
              return (
                <span key={f.name} className={`file-chip ${chipStatus}`}>
                  {chipStatus === "done" && (
                    <span className="file-status-icon">✓</span>
                  )}
                  {chipStatus === "active" && (
                    <span className="file-status-spinner" />
                  )}
                  {chipStatus === "skipped" && (
                    <span className="file-status-icon">✕</span>
                  )}
                  {chipStatus === "pending" && (
                    <span className="file-status-icon">⏳</span>
                  )}
                  {f.name.replace(/\.(heic|heif|HEIC|HEIF|jpg|jpeg|JPG|JPEG|png|PNG|webp|WEBP)$/, "")}
                </span>
              );
            })}
            {files.length > 5 && (
              <span className="file-chip">
                +{files.length - 5} more
              </span>
            )}
          </div>
          <div className="progress-info">
            <span className="progress-current">
              Photo {currentFileIndex !== undefined ? currentFileIndex + 1 : files.length} of {files.length}
            </span>
            <span>{progress ?? 0}%</span>
          </div>
          <div className="progress-track accent">
            <div className="progress-bar" style={{ width: `${progress ?? 0}%` }} />
          </div>
          {isConverting && onCancel && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                type="button"
                onClick={onCancel}
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
                Cancel
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="drop-zone-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="4" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M24 16V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 24L24 16L32 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="37" x2="36" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <h2>{t("title")}</h2>
          <p>{t("subtitle")}</p>
          <div style={{ textAlign: "center" }}>
          <div
            className="split-btn-wrap"
            ref={browseRef}
            onMouseEnter={() => { cancelBrowseClose(); setBrowseHover(true); }}
            onMouseLeave={scheduleBrowseClose}
          >
            <button className="split-btn-main" onClick={onBrowse} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {t("browseBtn")}
            </button>
            {browseOpen && (
              <div className="split-btn-dropdown">
                <button onClick={() => { setBrowseHover(false); onBrowse(); }} type="button">
                  <HiOutlineComputerDesktop size={28} aria-hidden="true" />
                  {t("fromDevice")}
                </button>
                <hr aria-hidden="true" />
                <button onClick={handleFromDropbox} type="button">
                  <FaDropbox size={28} aria-hidden="true" />
                  {t("fromDropbox")}
                </button>
                <hr aria-hidden="true" />
                <button onClick={handleFromGoogleDrive} type="button">
                  <SiGoogledrive size={28} aria-hidden="true" />
                  {t("fromGoogleDrive")}
                </button>
              </div>
            )}
          </div>
          <div className="hint">{t("hint")}</div>
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".heic,.HEIC,.heif,.HEIF,.jpg,.jpeg,.JPEG,.JPG,.png,.PNG,.webp,.WEBP"
        multiple
        style={{ display: "none" }}
        onChange={onInputChange}
      />
    </div>
  );
}
