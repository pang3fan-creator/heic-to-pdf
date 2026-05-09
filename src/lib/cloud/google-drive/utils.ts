import { googleDriveAuth } from "./auth";

const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

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

// Google Picker import — requires Google API Key + Picker API enabled in GCP
// For now, returns empty array (export-only MVP). Full Picker integration
// can be added when an API Key is configured.
export function pickFromGoogleDrive(): Promise<File[]> {
  return Promise.resolve([]);
}
