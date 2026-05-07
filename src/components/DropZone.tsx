"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { MAX_FILE_SIZE } from "@/lib/conversion-types";

interface Props {
  onFilesSelected: (files: FileList | File[]) => void;
  isActive: boolean;
}

function isHeicFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".heic") || lower.endsWith(".heif");
}

export default function DropZone({ onFilesSelected, isActive }: Props) {
  const t = useTranslations("hero.dropzone");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      const filtered = Array.from(files).filter(
        (f) => isHeicFile(f.name) && f.size <= MAX_FILE_SIZE,
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

  // Only show drop zone when idle
  if (!isActive) return null;

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
      <button className="browse-btn" onClick={onBrowse} type="button">{t("browseBtn")}</button>
      <div className="privacy-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {t("privacy")}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".heic,.HEIC,.heif,.HEIF"
        multiple
        style={{ display: "none" }}
        onChange={onInputChange}
      />
    </div>
  );
}
