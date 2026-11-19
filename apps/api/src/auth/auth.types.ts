import type { Role } from '@school-system/shared';

export interface UserRecord {
  id: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: Date | null;
  refreshTokenHash: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  phone: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  role: Role;
  typ: 'refresh';
  /** Unique per token so rotation always yields a distinct token. */
  jti: string;
}

export interface UserSummary {
  id: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
}

export function toUserSummary(user: UserRecord): UserSummary {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}
