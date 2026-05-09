import { onedriveAuth } from "./auth";

export async function uploadToOneDrive(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const token = await onedriveAuth.getAccessToken();
  if (!token) {
    await onedriveAuth.authorize();
    return false;
  }

  try {
    const encodedName = encodeURIComponent(filename);
    const resp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodedName}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
        },
        body: blob,
      },
    );
    return resp.ok;
  } catch {
    return false;
  }
}

export async function saveToOneDrive(
  blob: Blob,
  filename: string,
): Promise<boolean> {
  const token = await onedriveAuth.getAccessToken();
  if (!token) {
    const authorized = await onedriveAuth.authorize();
    if (!authorized) return false;
  }
  const ok = await uploadToOneDrive(blob, filename);
  if (!ok) {
    onedriveAuth.clearTokens();
  }
  return ok;
}

// OneDrive File Picker import — requires Azure App registration with Files.ReadWrite.All scope
// For now, returns empty array (export-only MVP).
export function pickFromOneDrive(): Promise<File[]> {
  return Promise.resolve([]);
}
