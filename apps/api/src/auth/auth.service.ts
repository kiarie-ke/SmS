import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  ERROR_CODES,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  PASSWORD_RESET_TTL_MS,
} from '../common/constants';
import type {
  UserRecord,
  UserSummary,
} from './auth.types';
import { toUserSummary } from './auth.types';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService } from './password.service';
import { UserRepositoryPort } from './user.repository';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSummary;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepositoryPort,
    private readonly tokens: JwtTokenService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  async register(input: {
    email: string;
    phone: string;
    password: string;
    role: UserRecord['role'];
  }): Promise<UserSummary> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists');
    }
    if (await this.users.findByPhone(input.phone)) {
      throw new ConflictException('An account with this phone number already exists');
    }
    const user = await this.users.create({
      email,
      phone: input.phone,
      passwordHash: await this.passwords.hash(input.password),
      role: input.role,
    });
    return toUserSummary(user);
  }

  async login(input: { email: string; password: string }): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email);
    const genericError = new UnauthorizedException('Invalid email or password');
    if (!user) throw genericError;

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been disabled');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.max(
        1,
        Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000),
      );
      throw new HttpException(
        {
          code: ERROR_CODES.ACCOUNT_LOCKED,
          message: `Account locked after too many failed attempts. Try again in ${minutes} minute(s).`,
        },
        HttpStatus.LOCKED,
      );
    }

    const valid = await this.passwords.verify(user.passwordHash, input.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= MAX_FAILED_LOGINS;
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null;
      await this.users.registerFailedLogin(user.id, attempts, lockedUntil);
      if (shouldLock) {
        this.logger.warn(`Account ${user.email} locked after ${attempts} failed logins`);
        throw new HttpException(
          {
            code: ERROR_CODES.ACCOUNT_LOCKED,
            message: 'Account locked after too many failed attempts. Try again in 15 minutes.',
          },
          HttpStatus.LOCKED,
        );
      }
      throw genericError;
    }

    await this.users.recordLogin(user.id);
    return this.issueTokens({ ...user, failedLoginAttempts: 0, lockedUntil: null });
  }

  async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    let userId: string;
    try {
      const payload = await this.tokens.verifyRefreshToken(refreshToken);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.users.findById(userId);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      if (user) await this.users.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Session is no longer valid');
    }

    const matches = await this.passwords.verify(user.refreshTokenHash, refreshToken);
    if (!matches) {
      // Token reuse: revoke the whole session.
      await this.users.setRefreshTokenHash(user.id, null);
      this.logger.warn(`Refresh token reuse detected for ${user.email}; session revoked`);
      throw new UnauthorizedException('Session has been revoked');
    }

    return this.issueTokens(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.tokens.verifyRefreshToken(refreshToken);
      await this.users.setRefreshTokenHash(payload.sub, null);
    } catch {
      // An invalid token is already logged out; nothing to revoke.
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Account not found');

    const valid = await this.passwords.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (currentPassword === newPassword) {
      throw new ConflictException('The new password must be different from the current one');
    }

    await this.users.updatePasswordHash(user.id, await this.passwords.hash(newPassword));
    await this.users.setRefreshTokenHash(user.id, null);
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const message = 'If an account with that email exists, a reset link has been sent.';
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) return { message };

    const token = randomBytes(32).toString('hex');
    await this.users.setPasswordResetToken(
      user.id,
      await this.passwords.hash(token),
      new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    );

    this.logger.log(`Password reset token for ${user.email}: ${token}`);
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return isProduction ? { message } : { message, resetToken: token };
  }

  private async issueTokens(user: UserRecord): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccessToken(user),
      this.tokens.signRefreshToken(user),
    ]);
    await this.users.setRefreshTokenHash(
      user.id,
      await this.passwords.hash(refreshToken),
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTtlSeconds,
      user: toUserSummary(user),
    };
  }
}
