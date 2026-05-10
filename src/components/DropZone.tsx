"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_FILE_SIZE, getFileType } from "@/lib/conversion-types";
import { FaDropbox } from "react-icons/fa";
import { SiGoogledrive } from "react-icons/si";

interface Props {
  onFilesSelected: (files: FileList | File[]) => void;
  isConverting?: boolean;
  progress?: number;
  files?: { name: string; size: number; status: string }[];
  currentFileIndex?: number;
  onCancel?: () => void;
}

export default function DropZone({
  onFilesSelected,
  isConverting,
  progress,
  files,
  currentFileIndex,
  onCancel,
}: Props) {
  const t = useTranslations("hero.dropzone");
  const inputRef = useRef<HTMLInputElement>(null);
  const [browsePinned, setBrowsePinned] = useState(false);
  const [browseHover, setBrowseHover] = useState(false);
  const browseRef = useRef<HTMLDivElement>(null);
  const browseCloseTimer = useRef<number | undefined>(undefined);
  const browseOpen = browseHover || browsePinned;

  const scheduleBrowseClose = () => {
    if (browseCloseTimer.current !== undefined) clearTimeout(browseCloseTimer.current);
    browseCloseTimer.current = window.setTimeout(() => {
      setBrowseHover(false);
      setBrowsePinned(false);
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
    setBrowsePinned(false);
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
    setBrowsePinned(false);
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
      className="drop-zone"
      id="dropZone"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add("dragover");
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      {showProcessing && files ? (
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
          <div className="hint">{t("hint")}</div>
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
            <button
              className="split-btn-arrow"
              onClick={() => setBrowsePinned((v) => !v)}
              type="button"
              aria-label="More options"
            >
              ▾
            </button>
            {browseOpen && (
              <div className="split-btn-dropdown">
                <button onClick={() => { setBrowsePinned(false); setBrowseHover(false); onBrowse(); }} type="button">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
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
          </div>
          <div className="privacy-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {t("privacy")}
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
