import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { randomBytes } from 'node:crypto';
import {
  CSRF_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from '../common/constants';
import { parseDurationMs } from '../common/duration';

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  private get secure(): boolean {
    const raw = this.config.get<unknown>('COOKIE_SECURE');
    return raw === true || raw === 'true';
  }

  private get refreshMaxAge(): number {
    return parseDurationMs(
      this.config.get<string>('JWT_REFRESH_TTL'),
      7 * 24 * 60 * 60 * 1000,
    );
  }

  /** Sets the refresh token (httpOnly) and a readable CSRF token cookie. */
  setAuthCookies(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.refreshMaxAge,
    });
    response.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), {
      httpOnly: false,
      secure: this.secure,
      sameSite: 'strict',
      path: '/',
      maxAge: this.refreshMaxAge,
    });
  }

  clearAuthCookies(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, {
      path: REFRESH_COOKIE_PATH,
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
    });
    response.clearCookie(CSRF_COOKIE, {
      path: '/',
      secure: this.secure,
      sameSite: 'strict',
    });
  }
}
