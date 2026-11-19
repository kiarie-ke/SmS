import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/http-client';
import { forwardSetCookies, readCookie } from '@/lib/api/forward-cookies';
import { CSRF_COOKIE } from '@/lib/api/cookies';
import { SESSION_COOKIE } from '@/lib/session';

export async function DELETE(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const csrfToken = readCookie(cookieHeader, CSRF_COOKIE);

  const apiResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    cache: 'no-store',
  });

  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.delete(SESSION_COOKIE);
  forwardSetCookies(apiResponse, response);
  return response;
}
