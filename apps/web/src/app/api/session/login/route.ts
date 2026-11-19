import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api/http-client';
import { forwardSetCookies } from '@/lib/api/forward-cookies';
import type { LoginResponseDto } from '@/lib/api/generated/models';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from '@/lib/session';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { message: 'Email and password are required' },
      { status: 400 },
    );
  }

  const apiResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: 'no-store',
  });

  const payload = (await apiResponse.json().catch(() => null)) as {
    success?: boolean;
    data?: LoginResponseDto;
    error?: { message?: string; code?: string };
  } | null;

  if (!apiResponse.ok || !payload?.success || !payload.data) {
    return NextResponse.json(
      {
        message: payload?.error?.message ?? 'Unable to sign in',
        code: payload?.error?.code ?? 'UNAUTHORIZED',
      },
      { status: apiResponse.status || 401 },
    );
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
