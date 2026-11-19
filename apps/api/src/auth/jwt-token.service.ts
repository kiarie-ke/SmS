import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { parseDurationMs } from '../common/duration';
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  UserRecord,
} from './auth.types';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get accessSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private get refreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get accessTtlSeconds(): number {
    return Math.floor(parseDurationMs(this.config.get<string>('JWT_ACCESS_TTL'), 15 * 60 * 1000) / 1000);
  }

  get refreshTtlMs(): number {
    return parseDurationMs(this.config.get<string>('JWT_REFRESH_TTL'), 7 * 24 * 60 * 60 * 1000);
  }

  signAccessToken(
    user: Pick<UserRecord, 'id' | 'email' | 'phone' | 'role'>,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtlSeconds,
    });
  }

  signRefreshToken(user: Pick<UserRecord, 'id' | 'role'>): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: user.id,
      role: user.role,
      typ: 'refresh',
      jti: randomUUID(),
    };
    return this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: Math.floor(this.refreshTtlMs / 1000),
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.refreshSecret,
    });
  }
}
