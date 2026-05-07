// src/components/ConversionSettings.tsx

"use client";

import { useTranslations } from "next-intl";
import {
  type ConversionSettings as Settings,
} from "@/lib/conversion-types";

interface Props {
  value: Settings;
  onChange: (s: Settings) => void;
}

function RadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {options.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
              color: "var(--fg)",
            }}
          >
            <input
              type="radio"
              name={label}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: "var(--accent)" }}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function ConversionSettings({ value, onChange }: Props) {
  const t = useTranslations("converter.settings");

  return (
    <div
      style={{
        marginTop: 24,
        padding: 24,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        textAlign: "left",
      }}
    >
      <RadioGroup
        label={t("paperSize.label")}
        options={[
          { value: "original" as const, label: t("paperSize.original") },
          { value: "a4" as const, label: t("paperSize.a4") },
        ]}
        value={value.paperSize}
        onChange={(v) => onChange({ ...value, paperSize: v })}
      />

      <RadioGroup
        label={t("margins.label")}
        options={[
          { value: "none" as const, label: t("margins.none") },
          { value: "narrow" as const, label: t("margins.narrow") },
          { value: "normal" as const, label: t("margins.normal") },
        ]}
        value={value.margins}
        onChange={(v) => onChange({ ...value, margins: v })}
      />

      <RadioGroup
        label={t("orientation.label")}
        options={[
          { value: "portrait" as const, label: t("orientation.portrait") },
          { value: "landscape" as const, label: t("orientation.landscape") },
        ]}
        value={value.orientation}
        onChange={(v) => onChange({ ...value, orientation: v })}
      />
    </div>
  );
}
