"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

interface FileInfo {
  name: string;
  size: number;
}

function formatSize(bytes: number): string {
  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function DropZone() {
  const t = useTranslations("hero.dropzone");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [progress, setProgress] = useState(0);
  const [converting, setConverting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const simulateConversion = useCallback(() => {
    setConverting(true);
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setConverting(false);
      }
      setProgress(Math.min(p, 100));
    }, 300);
  }, []);

  const handleFiles = useCallback(
    (incoming: FileList) => {
      const fileList = Array.from(incoming);
      setFiles(fileList);
      if (fileList.length > 0) {
        simulateConversion();
      }
    },
    [simulateConversion],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
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

  const hasFiles = files.length > 0;

  return (
    <>
      <div
        className={`drop-zone${dragging ? " dragover" : ""}`}
        id="dropZone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="drop-zone-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect
              x="6"
              y="4"
              width="36"
              height="40"
              rx="4"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M24 16V32"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 24L24 16L32 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="12"
              y1="37"
              x2="36"
              y2="37"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2>
          {hasFiles
            ? t("filesSelected", { count: files.length })
            : t("title")}
        </h2>
        <p>{hasFiles ? "" : t("subtitle")}</p>
        <div className="hint">{t("hint")}</div>
        <button className="browse-btn" onClick={onBrowse} type="button">
          {t("browseBtn")}
        </button>
        <div className="privacy-note">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {t("privacy")}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".heic,.HEIC"
          multiple
          style={{ display: "none" }}
          onChange={onInputChange}
        />

        {/* Processing Status */}
        <div className={`processing-status${hasFiles ? " active" : ""}`}>
          <div className="file-list" id="fileList">
            {files.slice(0, 5).map((f, i) => (
              <span key={i} className="file-chip">
                <span className="file-ext">{t("ext")}</span>{" "}
                {f.name.replace(/\.(heic|HEIC)$/, "")}{" "}
                <span className="file-size">{formatSize(f.size)}</span>
              </span>
            ))}
            {files.length > 5 && (
              <span className="file-chip">
                {t("moreFiles", { count: files.length - 5 })}
              </span>
            )}
          </div>
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
