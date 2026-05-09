import { generatePKCE, openOAuthPopup, createTokenManager } from "../oauth-core";
import { googleDriveConfig } from "./config";
import type { CloudAuthAdapter } from "../types";

const mgr = createTokenManager("google_drive_");

export const googleDriveAuth: CloudAuthAdapter = {
  async authorize(): Promise<boolean> {
    if (!googleDriveConfig.clientId) return false;

    const { state, codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("google_drive_oauth_state", state);
    localStorage.setItem("google_drive_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: googleDriveConfig.clientId,
      response_type: "code",
      redirect_uri: googleDriveConfig.redirectUri,
      scope: googleDriveConfig.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    });

    // Google's OAuth page sets Cross-Origin-Opener-Policy which breaks popup
    // communication. Use full-page redirect instead.
    location.href = `${googleDriveConfig.authUrl}?${params}`;
    return false;
  },

  async handleCallback(): Promise<boolean> {
    const code = mgr.getParam("code");
    const state = mgr.getParam("state");
    const error = mgr.getParam("error");
    if (error || !code || !state) return false;

    const savedState = localStorage.getItem("google_drive_oauth_state");
    if (state !== savedState) return false;

    const verifier = localStorage.getItem("google_drive_code_verifier");
    if (!verifier) return false;

    mgr.cleanupParams();
    return mgr.exchangeCode(googleDriveConfig, code, verifier);
  },

  async getAccessToken(): Promise<string | null> {
    return mgr.getValidAccessToken(googleDriveConfig);
  },

  clearTokens(): void {
    mgr.clearTokens();
  },
};
