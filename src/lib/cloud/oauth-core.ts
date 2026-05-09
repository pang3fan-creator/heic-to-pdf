// src/lib/cloud/oauth-core.ts
import type { OAuthConfig, TokenStore } from "./types";

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generatePKCE(): Promise<{
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}> {
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(64)));
  const codeChallenge = base64url(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier)),
  );
  return { state, codeVerifier, codeChallenge };
}

export function openOAuthPopup(
  url: string,
  eventType: string,
): Promise<boolean> {
  const popup = window.open(url, `${eventType}-auth`, "width=800,height=700");
  if (!popup) {
    location.href = url;
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === eventType) {
        window.removeEventListener("message", handler);
        resolve(e.data.success === true);
      }
    };
    window.addEventListener("message", handler);

    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", handler);
        resolve(false);
      }
    }, 500);
  });
}

export function notifyOpener(type: string, success: boolean): void {
  if (window.opener) {
    window.opener.postMessage({ type, success }, window.origin);
  }
}

export function createTokenManager(prefix: string) {
  const k = (key: string) => `${prefix}${key}`;

  function saveTokens(tokens: TokenStore): void {
    localStorage.setItem(k("access_token"), tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem(k("refresh_token"), tokens.refreshToken);
    }
    localStorage.setItem(k("token_expires"), String(tokens.expiresAt));
  }

  function getTokens(): TokenStore | null {
    const accessToken = localStorage.getItem(k("access_token"));
    const refreshToken = localStorage.getItem(k("refresh_token"));
    const expiresAt = Number(localStorage.getItem(k("token_expires")) || 0);
    if (!accessToken) return null;
    return { accessToken, refreshToken, expiresAt };
  }

  function clearTokens(): void {
    localStorage.removeItem(k("access_token"));
    localStorage.removeItem(k("refresh_token"));
    localStorage.removeItem(k("token_expires"));
  }

  function getParam(name: string): string | null {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  function cleanupParams(): void {
    localStorage.removeItem(k("oauth_state"));
    localStorage.removeItem(k("code_verifier"));
  }

  async function exchangeCode(
    config: OAuthConfig,
    code: string,
    verifier: string,
  ): Promise<boolean> {
    try {
      const resp = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          code_verifier: verifier,
        }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || null,
        expiresAt: Date.now() + config.tokenLifetimeMs,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function refreshAccessToken(
    config: OAuthConfig,
  ): Promise<boolean> {
    const tokens = getTokens();
    if (!tokens?.refreshToken) return false;
    try {
      const resp = await fetch(config.refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokens.refreshToken,
          client_id: config.clientId,
        }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      saveTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokens.refreshToken,
        expiresAt: Date.now() + config.tokenLifetimeMs,
      });
      return true;
    } catch {
      return false;
    }
  }

  async function getValidAccessToken(
    config: OAuthConfig,
  ): Promise<string | null> {
    const tokens = getTokens();
    if (tokens && Date.now() < tokens.expiresAt) {
      return tokens.accessToken;
    }
    const refreshed = await refreshAccessToken(config);
    if (refreshed) {
      return getTokens()?.accessToken ?? null;
    }
    return null;
  }

  return {
    saveTokens,
    getTokens,
    clearTokens,
    getParam,
    cleanupParams,
    exchangeCode,
    refreshAccessToken,
    getValidAccessToken,
  };
}

export type TokenManager = ReturnType<typeof createTokenManager>;
