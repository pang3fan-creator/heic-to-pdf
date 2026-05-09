// src/lib/dropbox-auth.ts

const UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload";

/**
 * Upload a Blob to Dropbox via API v2 /files/upload.
 * Auth is handled by the cloud abstraction layer.
 * Returns true on success.
 */
export async function uploadToDropbox(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const { dropboxAuth } = await import("@/lib/cloud/dropbox/auth");
  let token = await dropboxAuth.getAccessToken();
  if (!token) {
    const ok = await dropboxAuth.authorize();
    if (!ok) return false;
    token = await dropboxAuth.getAccessToken();
    if (!token) return false;
  }

  try {
    const resp = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({
          path: `/${filename}`,
          mode: "add",
          autorename: true,
        }),
        "Content-Type": "application/octet-stream",
      },
      body: blob,
    });
    return resp.ok;
  } catch {
    return false;
  }
}
