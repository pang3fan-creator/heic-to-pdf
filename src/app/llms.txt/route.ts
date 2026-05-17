// src/app/llms.txt/route.ts
// Provides a structured summary of the site for AI search engines (ChatGPT, Perplexity, etc.)
// https://llmstxt.org/
import { NextResponse } from "next/server";

export function GET() {
  const content = `# HEICPDF.TO

> Convert HEIC to PDF online — free, private, no uploads required.

## Overview

HEICPDF.TO is a free online tool that converts Apple HEIC/HEIF photos to PDF documents entirely in the browser using WebAssembly. No files are uploaded to any server — everything stays local.

## Key Features

- HEIC to PDF conversion
- Batch conversion (up to 20 images)
- Dropbox & Google Drive integration
- Page arrangement and customization (paper size, margins, orientation)
- Merge into single PDF or keep separate
- 100% browser-based — no uploads, total privacy
- Dark and light mode

## Useful Links

- Home: https://heicpdf.to
- Privacy Policy: https://heicpdf.to/privacy
- Terms of Service: https://heicpdf.to/terms
- How to Convert HEIC to PDF (Guide): https://heicpdf.to/blog/how-to-convert-heic-to-pdf
- Pricing (AI-readable): https://heicpdf.to/pricing.md

## FAQ

- **What is HEIC?** Apple's image format that's been default on iPhones since iOS 11. It cuts file sizes by about half compared to JPEG.
- **Is my privacy protected?** Yes. All conversion happens locally in your browser. Your files never leave your device.
- **Does it support batch conversion?** Yes, up to 20 HEIC photos at once.
- **Do I need to install software?** No. Works in Chrome, Safari, Edge, and Firefox.
- **Will quality degrade?** No. Images are decoded at full resolution in the PDF.
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
