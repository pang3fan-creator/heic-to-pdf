import type { OAuthConfig } from "../types";

export const dropboxConfig: OAuthConfig = {
  authUrl: "https://www.dropbox.com/oauth2/authorize",
  tokenUrl: "https://api.dropbox.com/oauth2/token",
  refreshUrl: "https://api.dropbox.com/oauth2/token",
  clientId: process.env.NEXT_PUBLIC_DROPBOX_APP_KEY || "",
  redirectUri: typeof window !== "undefined"
    ? `${window.location.origin}/auth/dropbox/callback`
    : "",
  scope: "",
  storagePrefix: "dropbox_",
  tokenLifetimeMs: 14400000,
};
