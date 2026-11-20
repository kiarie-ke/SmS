import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditCreateData {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

export abstract class AuditRepositoryPort {
  abstract list(skip: number, take: number, entityType?: string): Promise<{ rows: AuditLogRecord[]; total: number }>;
  abstract record(data: AuditCreateData): Promise<AuditLogRecord>;
}

@Injectable()
export class AuditRepository extends AuditRepositoryPort {
  constructor(private readonly prisma: PrismaService) { super(); }
  async list(skip: number, take: number, entityType?: string) {
    const where = entityType ? { entityType } : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { rows: rows as unknown as AuditLogRecord[], total };
  }

  async record(data: AuditCreateData): Promise<AuditLogRecord> {
    const row = await this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        before: (data.before as any) ?? undefined,
        after: (data.after as any) ?? undefined,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
    return row as unknown as AuditLogRecord;
  }
}
