// src/lib/zip-utils.ts

import JSZip from "jszip";

/**
 * Generate non-conflicting PDF filenames from source file names.
 *
 * Example:
 *   ["1.jpg", "1.png", "1-1.jpg"]
 *   → ["1.pdf", "1-1.pdf", "1-1-1.pdf"]
 */
export function resolvePdfNames(files: { name: string }[]): string[] {
  const used = new Set<string>();
  const result: string[] = [];

  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, "");
    let candidate = `${base}.pdf`;
    let counter = 1;

    while (used.has(candidate)) {
      candidate = `${base}-${counter}.pdf`;
      counter++;
    }

    used.add(candidate);
    result.push(candidate);
  }

  return result;
}

/**
 * Bundle multiple PDF blobs into a single zip Blob.
 */
export async function createZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const { name, blob } of entries) {
    zip.file(name, blob);
  }
  return zip.generateAsync({ type: "blob" });
}
