// src/components/ConversionContainer.tsx

"use client";

import { useTranslations } from "next-intl";

import { useHeicConversion } from "@/hooks/useHeicConversion";
import DropZone from "./DropZone";
import EditorOverlay from "./EditorOverlay";
import GlobalDropOverlay from "./GlobalDropOverlay";

export default function ConversionContainer() {
  const conversion = useHeicConversion();
  const s = conversion.state;
  const t = useTranslations("converter.error");

  return (
    <>
      <GlobalDropOverlay onFilesDropped={s.status === "editor" ? conversion.addMoreFiles : conversion.selectFiles} />

      <DropZone
        onFilesSelected={s.status === "editor" ? conversion.addMoreFiles : conversion.selectFiles}
        isConverting={s.status === "converting"}
        files={s.status === "converting" || s.status === "error" ? s.files : undefined}
        currentFileIndex={s.status === "converting" ? s.currentFileIndex : undefined}
        progress={s.status === "converting" ? s.progress : undefined}
        onCancel={conversion.cancel}
        blob={s.status === "complete" ? s.blob! : undefined}
        blobType={s.status === "complete" ? s.blobType : undefined}
        sizeBytes={s.status === "complete" ? s.sizeBytes : undefined}
        onReset={conversion.reset}
      />

      {s.status === "editor" && (
        <EditorOverlay
          files={s.files}
          settings={s.settings}
          onClose={conversion.closeEditor}
          onConvert={conversion.startConversion}
          onAddFiles={conversion.addMoreFiles}
          onRemoveFile={conversion.removeFile}
          onRotateFile={conversion.rotateFile}
          onSettingsChange={conversion.updateSettings}
        />
      )}

      {s.status === "error" && (
        <div className="error-state">
          <div className="error-card">
            <div className="error-icon-circle">!</div>
            <div className="error-title">{t("title")}</div>
            <div className="error-detail">{s.error}</div>
            <div className="error-actions">
              <button
                type="button"
                onClick={conversion.reset}
                className="btn-ghost"
              >
                {t("back")}
              </button>
              <button
                type="button"
                onClick={conversion.startConversion}
                className="btn-retry"
              >
                {t("retry")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
