import type { NextResponse } from 'next/server';

interface GetSetCookieHeaders {
  getSetCookie?: () => string[];
}

/** Copies every Set-Cookie header from an API response onto a Next response. */
export function forwardSetCookies(from: Response, to: NextResponse): void {
  const headers = from.headers as unknown as GetSetCookieHeaders;
  const cookies = headers.getSetCookie ? headers.getSetCookie() : [];
  if (cookies.length === 0) {
    const single = from.headers.get('set-cookie');
    if (single) to.headers.append('set-cookie', single);
    return;
  }
  for (const cookie of cookies) {
    to.headers.append('set-cookie', cookie);
  }
}

/** Reads a single cookie value out of a raw Cookie header. */
export function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return undefined;
}
