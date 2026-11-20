import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationRecord {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  channel: string;
  type: string;
  isRead: boolean;
  readAt: Date | null;
  metadata: unknown;
  createdAt: Date;
}

export abstract class NotificationRepositoryPort {
  abstract listForUser(userId: string, skip: number, take: number): Promise<{ rows: NotificationRecord[]; total: number }>;
  abstract markRead(id: string, userId: string): Promise<NotificationRecord | null>;
  abstract markAllRead(userId: string): Promise<number>;
  abstract countUnread(userId: string): Promise<number>;
}

@Injectable()
export class NotificationRepository extends NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) { super(); }
  async listForUser(userId: string, skip: number, take: number) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { recipientUserId: userId }, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where: { recipientUserId: userId } }),
    ]);
    return { rows: rows as unknown as NotificationRecord[], total };
  }
  async markRead(id: string, userId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, recipientUserId: userId } });
    if (!existing) return null;
    const r = await this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
    return r as unknown as NotificationRecord;
  }
  async markAllRead(userId: string) {
    const r = await this.prisma.notification.updateMany({ where: { recipientUserId: userId, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return r.count;
  }
  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { recipientUserId: userId, isRead: false } });
  }
}