import { googleDriveAuth } from "./auth";

const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
// Bump this when OAuth scope changes to force re-authorization
const SCOPE_VERSION = "v2";

const SUPPORTED_IMAGE_TYPES = [
  "image/heic", "image/heif",
  "image/jpeg", "image/png", "image/webp",
];

export async function uploadToGoogleDrive(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const token = await googleDriveAuth.getAccessToken();

  if (!token) {
    await googleDriveAuth.authorize();
    return false;
  }

  try {
    const metadata = { name: filename, parents: ["root"] };
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", blob, filename);

    const resp = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function saveToGoogleDrive(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const token = await googleDriveAuth.getAccessToken();
  if (!token) {
    const authorized = await googleDriveAuth.authorize();
    if (!authorized) return false;
  }
  const ok = await uploadToGoogleDrive(blob, filename);
  if (!ok) {
    googleDriveAuth.clearTokens();
  }
  return ok;
}

// ── Google Picker (Import) ─────────────────────────────

let pickerLoaded: Promise<void> | null = null;

async function ensurePickerSdk(): Promise<void> {
  if ((window as any).google?.picker) return;
  if (pickerLoaded) return pickerLoaded;

  pickerLoaded = new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = () => {
      (window as any).gapi?.load("picker", () => resolve());
    };
    document.body.appendChild(script);
  });

  return pickerLoaded;
}

/**
 * Open Google Picker to select image files from Google Drive.
 * Uses OAuth token for authentication and API Key for Picker access.
 * Returns selected files as File[] (empty if cancelled).
 */
export async function pickFromGoogleDrive(): Promise<File[]> {
  if (!API_KEY) return [];

  // Force re-authorization when scope version changes
  const storedScopeVer = localStorage.getItem("google_drive_scope_version");
  if (storedScopeVer !== SCOPE_VERSION) {
    googleDriveAuth.clearTokens();
    localStorage.setItem("google_drive_scope_version", SCOPE_VERSION);
  }

  // Check if we just returned from the OAuth redirect flow
  const pendingPicker = sessionStorage.getItem("google_picker_pending");

  // Ensure we have a valid access token
  let token = await googleDriveAuth.getAccessToken();
  if (!token) {
    if (!pendingPicker) {
      // First visit — save flag and redirect to Google auth
      sessionStorage.setItem("google_picker_pending", "true");
      await googleDriveAuth.authorize(); // this does location.href redirect
    }
    // Returning from auth redirect with token now available
    sessionStorage.removeItem("google_picker_pending");
    token = await googleDriveAuth.getAccessToken();
    if (!token) return [];
  }

  await ensurePickerSdk();

  const gp = (window as any).google.picker;

  // Ensure Picker appears above the editor overlay (z-index: 10000)
  const zFix = document.createElement("style");
  zFix.id = "picker-z-fix";
  zFix.textContent =
    ".picker-dialog{z-index:2147483647!important}" +
    ".picker-dialog-bg{z-index:2147483646!important}";
  document.head.appendChild(zFix);

  return new Promise<File[]>((resolve) => {
    let resolved = false;

    const cleanup = () => document.getElementById("picker-z-fix")?.remove();

    const picker = new gp.PickerBuilder()
      .addView(
        new gp.DocsView()
          .setMimeTypes("image/png,image/jpeg,image/webp,image/heic,image/heif")
          .setIncludeFolders(false),
      )
      .enableFeature(gp.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setCallback(async (data: any) => {
        cleanup();
        if (resolved) return;
        const action = data[gp.Response.ACTION];
        if (action === gp.Action.PICKED) {
          resolved = true;
          const docs = data[gp.Response.DOCUMENTS] as any[];
          const results = await Promise.allSettled(
            docs
              .filter((d) => SUPPORTED_IMAGE_TYPES.includes(d.mimeType))
              .map(async (d) => {
                const resp = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${d.id}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true`,
                  { headers: { Authorization: `Bearer ${token}` } },
                );
                if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
                const blob = await resp.blob();
                return new File([blob], d.name, { type: blob.type });
              }),
          );
          resolve(
            results
              .filter((r) => r.status === "fulfilled")
              .map((r: any) => r.value),
          );
        } else if (action === gp.Action.CANCEL) {
          resolved = true;
          resolve([]);
        }
      })
      .build();
    picker.setVisible(true);
  });
}
