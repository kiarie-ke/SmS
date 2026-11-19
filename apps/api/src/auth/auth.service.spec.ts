import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@school-system/shared';
import { AuthService } from './auth.service';
import type { UserRecord } from './auth.types';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService } from './password.service';
import { UserRepositoryPort } from './user.repository';

function createConfigStub(): ConfigService {
  const values: Record<string, unknown> = {
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'access-secret-for-tests-0123456789abcdef',
    JWT_REFRESH_SECRET: 'refresh-secret-for-tests-0123456789abcdef',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
    DATABASE_URL: 'postgresql://localhost:5432/test',
  };
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`Missing ${key}`);
      return values[key];
    },
  } as unknown as ConfigService;
}

class InMemoryUserRepository extends UserRepositoryPort {
  users = new Map<string, UserRecord>();
  private sequence = 0;

  seed(user: Partial<UserRecord> & { email: string }): UserRecord {
    this.sequence += 1;
    const record: UserRecord = {
      id: `user-${this.sequence}`,
      email: user.email,
      phone: user.phone ?? '+254700000000',
      passwordHash: user.passwordHash ?? 'not-a-real-hash',
      role: (user.role ?? 'ADMIN') as Role,
      isActive: user.isActive ?? true,
      lastLoginAt: user.lastLoginAt ?? null,
      refreshTokenHash: user.refreshTokenHash ?? null,
      failedLoginAttempts: user.failedLoginAttempts ?? 0,
      lockedUntil: user.lockedUntil ?? null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    };
    this.users.set(record.id, record);
    return record;
  }

  async findByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async findByPhone(phone: string) {
    return [...this.users.values()].find((user) => user.phone === phone) ?? null;
  }

  async findById(id: string) {
    return this.users.get(id) ?? null;
  }

  async create(data: { email: string; phone: string; passwordHash: string; role: Role }) {
    return this.seed(data);
  }

  async recordLogin(id: string) {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }
  }

  async registerFailedLogin(id: string, attempts: number, lockedUntil: Date | null) {
    const user = this.users.get(id);
    if (user) {
      user.failedLoginAttempts = attempts;
      user.lockedUntil = lockedUntil;
    }
  }

  async setRefreshTokenHash(id: string, hash: string | null) {
    const user = this.users.get(id);
    if (user) user.refreshTokenHash = hash;
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    const user = this.users.get(id);
    if (user) user.passwordHash = passwordHash;
  }

  async setPasswordResetToken(id: string, tokenHash: string | null, expiresAt: Date | null) {
    const user = this.users.get(id);
    if (user) {
      user.passwordResetTokenHash = tokenHash;
      user.passwordResetExpiresAt = expiresAt;
    }
  }

  async findDefaultSchoolId() {
    return null;
  }
}

describe('AuthService', () => {
  let repository: InMemoryUserRepository;
  let passwords: PasswordService;
  let service: AuthService;

  const config = createConfigStub();

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    passwords = new PasswordService();
    service = new AuthService(
      repository,
      new JwtTokenService(new JwtService(), config),
      passwords,
      config,
    );
  });

  async function seedAdmin(password = 'Admin@1234') {
    return repository.seed({
      email: 'admin@example.ac.ke',
      passwordHash: await passwords.hash(password),
      role: 'ADMIN',
    });
  }

  it('rejects an unknown email with a generic error', async () => {
    await expect(
      service.login({ email: 'nobody@example.ac.ke', password: 'whatever' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('increments failed attempts on a wrong password', async () => {
    const user = await seedAdmin();
    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 401 });
    expect(repository.users.get(user.id)?.failedLoginAttempts).toBe(1);
  });

  it('locks the account after five failed attempts', async () => {
    const user = await seedAdmin();
    for (let attempt = 0; attempt < 4; attempt++) {
      await expect(
        service.login({ email: user.email, password: 'wrong-password' }),
      ).rejects.toMatchObject({ status: 401 });
    }

    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toMatchObject({ status: 423 });

    const stored = repository.users.get(user.id);
    expect(stored?.lockedUntil).toBeInstanceOf(Date);
    expect(stored?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it('issues tokens and stores a refresh hash on success', async () => {
    const user = await seedAdmin();
    const result = await service.login({ email: user.email, password: 'Admin@1234' });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.expiresIn).toBe(900);
    expect(result.user.email).toBe(user.email);
    expect(repository.users.get(user.id)?.refreshTokenHash).toEqual(expect.any(String));
    expect(repository.users.get(user.id)?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('rotates the refresh token and revokes the session on reuse', async () => {
    const user = await seedAdmin();
    const first = await service.login({ email: user.email, password: 'Admin@1234' });

    const rotated = await service.refresh(first.refreshToken);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(rotated.accessToken).toEqual(expect.any(String));

    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 });
    expect(repository.users.get(user.id)?.refreshTokenHash).toBeNull();
  });

  it('rejects a refresh token when no session hash is stored', async () => {
    const user = await seedAdmin();
    const first = await service.login({ email: user.email, password: 'Admin@1234' });
    await repository.setRefreshTokenHash(user.id, null);

    await expect(service.refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it('requires the current password to change the password and revokes sessions', async () => {
    const user = await seedAdmin();
    await service.login({ email: user.email, password: 'Admin@1234' });

    await expect(
      service.changePassword(user.id, 'not-the-password', 'NewPass@1234'),
    ).rejects.toMatchObject({ status: 401 });

    await service.changePassword(user.id, 'Admin@1234', 'NewPass@1234');
    expect(repository.users.get(user.id)?.refreshTokenHash).toBeNull();

    const result = await service.login({ email: user.email, password: 'NewPass@1234' });
    expect(result.user.id).toBe(user.id);
  });

  it('never reveals whether an email exists in forgot-password', async () => {
    const missing = await service.forgotPassword('missing@example.ac.ke');
    expect(missing.resetToken).toBeUndefined();

    const user = await seedAdmin();
    const existing = await service.forgotPassword(user.email);
    expect(existing.resetToken).toEqual(expect.any(String));
    expect(repository.users.get(user.id)?.passwordResetTokenHash).toEqual(expect.any(String));
  });
});
