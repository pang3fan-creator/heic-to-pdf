// src/lib/dropbox-utils.ts

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: DropboxChooseOptions) => void;
    };
  }
}

interface DropboxChooserFile {
  name: string;
  link: string;
  bytes: number;
  icon: string;
  thumbnailLink?: string;
  isDir: boolean;
}

interface DropboxChooseOptions {
  success: (files: DropboxChooserFile[]) => void;
  cancel?: () => void;
  linkType: "preview" | "direct";
  multiselect: boolean;
  extensions?: string[];
  sizeLimit?: number;
}

const SUPPORTED_DROPBOX_EXTENSIONS = [
  ".heic", ".heif",
  ".jpg", ".jpeg",
  ".png", ".webp",
];

let sdkLoading: Promise<void> | null = null;

/**
 * Load Dropbox SDK if not already loaded.
 */
async function ensureDropboxSdk(): Promise<void> {
  if (typeof window !== "undefined" && window.Dropbox?.choose) return;
  if (sdkLoading) return sdkLoading;

  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
  if (!appKey) {
    throw new Error("Dropbox App Key not configured");
  }

  sdkLoading = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.dropbox.com/static/api/2/dropins.js";
    script.id = "dropboxjs";
    script.setAttribute("data-app-key", appKey);
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

  return sdkLoading;
}

/**
 * Open Dropbox Chooser and return selected files as File objects.
 */
export async function pickFromDropbox(): Promise<File[]> {
  await ensureDropboxSdk();

  return new Promise<File[]>((resolve, reject) => {
    if (!window.Dropbox?.choose) {
      reject(new Error("Dropbox SDK not available"));
      return;
    }

    window.Dropbox.choose({
      success: async (files) => {
        try {
          const results = await Promise.all(
            files
              .filter((f) => !f.isDir)
              .map(async (f) => {
                const resp = await fetch(f.link, { mode: "cors" });
                const blob = await resp.blob();
                return new File([blob], f.name, { type: blob.type });
              }),
          );
          resolve(results);
        } catch (err) {
          reject(err);
        }
      },
      cancel: () => resolve([]),
      linkType: "direct",
      multiselect: true,
      extensions: SUPPORTED_DROPBOX_EXTENSIONS,
    });
  });
}

/**
 * Save a Blob to Dropbox via API v2 /files/upload.
 * Uses the cloud abstraction layer for auth.
 * Returns true if saved, false if needs authorization.
 */
export async function saveToDropbox(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const { uploadToDropbox } = await import("./dropbox-auth");
  return uploadToDropbox(blob, filename);
}
