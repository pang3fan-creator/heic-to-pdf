import { generatePKCE, openOAuthPopup, createTokenManager } from "../oauth-core";
import { onedriveConfig } from "./config";
import type { CloudAuthAdapter } from "../types";

const mgr = createTokenManager("onedrive_");

export const onedriveAuth: CloudAuthAdapter = {
  async authorize(): Promise<boolean> {
    if (!onedriveConfig.clientId) return false;

    const { state, codeVerifier, codeChallenge } = await generatePKCE();
    localStorage.setItem("onedrive_oauth_state", state);
    localStorage.setItem("onedrive_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: onedriveConfig.clientId,
      response_type: "code",
      redirect_uri: onedriveConfig.redirectUri,
      scope: onedriveConfig.scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return openOAuthPopup(
      `${onedriveConfig.authUrl}?${params}`,
      "onedrive-auth-complete",
    );
  },

  async handleCallback(): Promise<boolean> {
    const code = mgr.getParam("code");
    const state = mgr.getParam("state");
    const error = mgr.getParam("error");
    if (error || !code || !state) return false;

    const savedState = localStorage.getItem("onedrive_oauth_state");
    if (state !== savedState) return false;

    const verifier = localStorage.getItem("onedrive_code_verifier");
    if (!verifier) return false;

    mgr.cleanupParams();
    return mgr.exchangeCode(onedriveConfig, code, verifier);
  },

  async getAccessToken(): Promise<string | null> {
    return mgr.getValidAccessToken(onedriveConfig);
  },

  clearTokens(): void {
    mgr.clearTokens();
  },
};
