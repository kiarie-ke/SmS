import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/http-client';
import { forwardSetCookies, readCookie } from '@/lib/api/forward-cookies';
import type { LoginResponseDto } from '@/lib/api/generated/models';
import { CSRF_COOKIE } from '@/lib/api/cookies';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from '@/lib/session';

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie');
  const csrfToken = readCookie(cookieHeader, CSRF_COOKIE);

  const apiResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    cache: 'no-store',
  });

  const payload = (await apiResponse.json().catch(() => null)) as {
    success?: boolean;
    data?: LoginResponseDto;
    error?: { message?: string; code?: string };
  } | null;

  if (!apiResponse.ok || !payload?.success || !payload.data) {
    const response = NextResponse.json(
      { message: payload?.error?.message ?? 'Session expired' },
      { status: apiResponse.status || 401 },
    );
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const { accessToken, user } = payload.data;
  const response = NextResponse.json({ accessToken, user });
  response.cookies.set(
    SESSION_COOKIE,
    await signSession({ sub: user.id, email: user.email, role: user.role }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );
  forwardSetCookies(apiResponse, response);

  return response;
}
