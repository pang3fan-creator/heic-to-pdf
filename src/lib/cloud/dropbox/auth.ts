import { generatePKCE, openOAuthPopup, createTokenManager } from "../oauth-core";
import { dropboxConfig } from "./config";
import type { CloudAuthAdapter } from "../types";

const mgr = createTokenManager("dropbox_");

export const dropboxAuth: CloudAuthAdapter = {
  async authorize(): Promise<boolean> {
    if (!dropboxConfig.clientId) return false;

    const { state, codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("dropbox_oauth_state", state);
    localStorage.setItem("dropbox_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: dropboxConfig.clientId,
      response_type: "code",
      redirect_uri: dropboxConfig.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      token_access_type: "offline",
    });

    return openOAuthPopup(
      `${dropboxConfig.authUrl}?${params}`,
      "dropbox-auth-complete",
    );
  },

  async handleCallback(): Promise<boolean> {
    const code = mgr.getParam("code");
    const state = mgr.getParam("state");
    const error = mgr.getParam("error");
    if (error || !code || !state) return false;

    const savedState = localStorage.getItem("dropbox_oauth_state");
    if (state !== savedState) return false;

    const verifier = localStorage.getItem("dropbox_code_verifier");
    if (!verifier) return false;

    mgr.cleanupParams();
    return mgr.exchangeCode(dropboxConfig, code, verifier);
  },

  async getAccessToken(): Promise<string | null> {
    return mgr.getValidAccessToken(dropboxConfig);
  },

  clearTokens(): void {
    mgr.clearTokens();
  },
};
