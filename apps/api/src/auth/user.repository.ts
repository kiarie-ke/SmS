import { Injectable } from '@nestjs/common';
import type { Role } from '@school-system/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRecord } from './auth.types';

/** DI port so services and tests never depend on Prisma directly. */
export abstract class UserRepositoryPort {
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findByPhone(phone: string): Promise<UserRecord | null>;
  abstract findById(id: string): Promise<UserRecord | null>;
  abstract create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserRecord>;
  abstract recordLogin(id: string): Promise<void>;
  abstract registerFailedLogin(
    id: string,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void>;
  abstract setRefreshTokenHash(id: string, hash: string | null): Promise<void>;
  abstract updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  abstract setPasswordResetToken(
    id: string,
    tokenHash: string | null,
    expiresAt: Date | null,
  ): Promise<void>;
  abstract findDefaultSchoolId(): Promise<string | null>;
}

@Injectable()
export class UserRepository extends UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  findByPhone(phone: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    phone: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserRecord> {
    return this.prisma.user.create({ data });
  }

  async recordLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async registerFailedLogin(
    id: string,
    attempts: number,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { refreshTokenHash: hash } });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async setPasswordResetToken(
    id: string,
    tokenHash: string | null,
    expiresAt: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    });
  }

  async findDefaultSchoolId(): Promise<string | null> {
    const school = await this.prisma.school.findFirst({ select: { id: true } });
    return school?.id ?? null;
  }
}
