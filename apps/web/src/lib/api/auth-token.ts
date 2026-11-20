/**
 * The access token lives in memory only (never localStorage). AuthProvider
 * writes it here so the generated API client can attach the bearer header.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}
