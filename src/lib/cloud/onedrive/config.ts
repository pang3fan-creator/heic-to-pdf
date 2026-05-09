import type { OAuthConfig } from "../types";

export const onedriveConfig: OAuthConfig = {
  authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  refreshUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || "",
  redirectUri: typeof window !== "undefined"
    ? `${window.location.origin}/auth/onedrive/callback`
    : "",
  scope: "offline_access Files.ReadWrite.All",
  storagePrefix: "onedrive_",
  tokenLifetimeMs: 3600000,
};
