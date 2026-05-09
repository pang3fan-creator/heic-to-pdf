// src/lib/dropbox-auth.ts

const AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropbox.com/oauth2/token";
const UPLOAD_URL = "https://content.dropboxapi.com/2/files/upload";

const APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || "";

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getRedirectUri(): string {
  return `${location.origin}/auth/dropbox/callback`;
}

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
  const token = await dropboxAuth.getAccessToken();
  if (!token) {
    const ok = await dropboxAuth.authorize();
    if (!ok) return false;
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
