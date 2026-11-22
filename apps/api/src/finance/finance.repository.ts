import { Injectable } from '@nestjs/common';
import type { FinanceTransactionType } from '@school-system/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FinanceTransactionRecord {
  id: string;
  type: FinanceTransactionType;
  category: string;
  description: string;
  amount: number;
  reference: string | null;
  occurredAt: Date;
  recordedByUserId: string;
  createdAt: Date;
  recordedBy: { email: string };
}

export interface FinanceTransactionCreateData {
  type: FinanceTransactionType;
  category: string;
  description: string;
  amount: number;
  reference: string | null;
  occurredAt: Date;
  recordedByUserId: string;
}

export interface FinanceTransactionListParams {
  skip: number;
  take: number;
  type?: FinanceTransactionType;
  fromDate?: Date;
  toDate?: Date;
}

export abstract class FinanceRepositoryPort {
  abstract create(data: FinanceTransactionCreateData): Promise<FinanceTransactionRecord>;
  abstract list(
    params: FinanceTransactionListParams,
  ): Promise<{ rows: FinanceTransactionRecord[]; total: number }>;
  abstract sumByType(params: {
    fromDate?: Date;
    toDate?: Date;
  }): Promise<Array<{ type: FinanceTransactionType; amount: number }>>;
}

function whereFor(
  params: Pick<FinanceTransactionListParams, 'type' | 'fromDate' | 'toDate'>,
): Prisma.FinanceTransactionWhereInput {
  return {
    ...(params.type ? { type: params.type } : {}),
    ...(params.fromDate || params.toDate
      ? {
          occurredAt: {
            ...(params.fromDate ? { gte: params.fromDate } : {}),
            ...(params.toDate ? { lte: params.toDate } : {}),
          },
        }
      : {}),
  };
}

@Injectable()
export class FinanceRepository extends FinanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: FinanceTransactionCreateData): Promise<FinanceTransactionRecord> {
    const row = await this.prisma.financeTransaction.create({
      data,
      include: { recordedBy: { select: { email: true } } },
    });
    return { ...row, amount: Number(row.amount) };
  }

  async list(params: FinanceTransactionListParams) {
    const where = whereFor(params);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.financeTransaction.findMany({
        where,
        include: { recordedBy: { select: { email: true } } },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.financeTransaction.count({ where }),
    ]);

    return { rows: rows.map((row) => ({ ...row, amount: Number(row.amount) })), total };
  }

  async sumByType(params: { fromDate?: Date; toDate?: Date }) {
    const rows = await this.prisma.financeTransaction.groupBy({
      by: ['type'],
      where: whereFor(params),
      _sum: { amount: true },
    });
    return rows.map((row) => ({
      type: row.type,
      amount: Number(row._sum.amount ?? 0),
    }));
  }
}
