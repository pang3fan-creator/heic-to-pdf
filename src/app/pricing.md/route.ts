// src/app/pricing.md/route.ts
// Machine-readable pricing for AI agents evaluating HEICPDF.TO
// https://heicpdf.to/pricing.md
import { NextResponse } from "next/server";

export function GET() {
  const content = `# Pricing — HEICPDF.TO

HEICPDF.TO is completely free to use. No registration, no trial, no credit card required.

## Free
- Price: $0 / month
- Limits: Up to 20 images per batch, 50 MB max per file
- Features:
  - HEIC/HEIF to PDF conversion (browser-based, no uploads)
  - Batch conversion with multi-page PDF output
  - Page arrangement, reordering, and customization
  - Paper size options (A4, Letter, match original)
  - Margin and orientation settings
  - Merge all images into one PDF, or keep separate files
  - Quality adjustment slider
  - Dropbox & Google Drive import/export
  - Dark and light mode
  - No registration or account required

## Privacy
- All file processing happens locally in the browser using WebAssembly
- No files are uploaded to any server
- No user data collected or stored
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
