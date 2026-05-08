// src/components/GlobalDropOverlay.tsx

"use client";

import { useCallback, useEffect, useRef } from "react";

interface Props {
  onFilesDropped: (files: FileList | File[]) => void;
}

export default function GlobalDropOverlay({ onFilesDropped }: Props) {
  const dragCounter = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) {
      overlayRef.current?.classList.add("active");
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      overlayRef.current?.classList.remove("active");
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      overlayRef.current?.classList.remove("active");
      if (e.dataTransfer?.files.length) {
        onFilesDropped(e.dataTransfer.files);
      }
    },
    [onFilesDropped],
  );

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  return (
    <div className="drop-overlay" id="dropOverlay" ref={overlayRef}>
      <div className="drop-overlay-inner">
        <div className="drop-overlay-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="6" y="4" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M24 16V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M16 24L24 16L32 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="37" x2="36" y2="37" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2>Drop images anywhere</h2>
        <p>Release to start converting — your files never leave your device</p>
      </div>
    </div>
  );
}
