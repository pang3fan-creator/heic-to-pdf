import type { OAuthConfig } from "../types";

export const googleDriveConfig: OAuthConfig = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  refreshUrl: "https://oauth2.googleapis.com/token",
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  redirectUri: typeof window !== "undefined"
    ? `${window.location.origin}/auth/google/callback`
    : "",
  scope: "https://www.googleapis.com/auth/drive",
  storagePrefix: "google_drive_",
  tokenLifetimeMs: 3600000,
  proxyUrl: "/api/auth/google/token",
};
