// src/components/ConversionContainer.tsx

"use client";

import { useHeicConversion } from "@/hooks/useHeicConversion";
import DropZone from "./DropZone";
import EditorOverlay from "./EditorOverlay";
import GlobalDropOverlay from "./GlobalDropOverlay";

export default function ConversionContainer() {
  const conversion = useHeicConversion();
  const s = conversion.state;

  return (
    <>
      <GlobalDropOverlay onFilesDropped={conversion.selectFiles} />

      <DropZone
        onFilesSelected={conversion.selectFiles}
        isConverting={s.status === "converting"}
        isComplete={s.status === "complete"}
        files={s.status === "converting" || s.status === "complete" || s.status === "error" ? s.files : undefined}
        currentFileIndex={s.status === "converting" ? s.currentFileIndex : undefined}
        progress={s.status === "converting" ? s.progress : undefined}
        onCancel={conversion.cancel}
      />

      {s.status === "editor" && (
        <EditorOverlay
          files={s.files}
          settings={s.settings}
          onClose={conversion.closeEditor}
          onConvert={conversion.startConversion}
          onAddFiles={conversion.addMoreFiles}
          onSettingsChange={conversion.updateSettings}
        />
      )}

      {s.status === "error" && (
        <div className="error-state">
          <div className="error-card">
            <div className="error-icon-circle">!</div>
            <div className="error-title">Conversion Failed</div>
            <div className="error-detail">{s.error}</div>
            <div className="error-actions">
              <button
                type="button"
                onClick={conversion.reset}
                className="btn-ghost"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={conversion.startConversion}
                className="btn-retry"
              >
                ↻ Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
