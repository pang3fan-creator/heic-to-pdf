export interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  refreshUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scope: string;
  storagePrefix: string;
  tokenLifetimeMs: number;
}

export interface TokenStore {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

export interface CloudAuthAdapter {
  authorize(): Promise<boolean>;
  handleCallback(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  clearTokens(): void;
}
