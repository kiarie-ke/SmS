import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import { paginate } from '../common/pagination';
import {
  CreateFinanceTransactionDto,
  FinanceSummaryQueryDto,
  FinanceTransactionQueryDto,
} from './finance.dto';
import { FinanceRepositoryPort } from './finance.repository';

function assertDateRange(fromDate?: string, toDate?: string): void {
  if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
    throw new BadRequestException('fromDate must be on or before toDate');
  }
}

@Injectable()
export class FinanceService {
  constructor(private readonly finance: FinanceRepositoryPort) {}

  create(user: AuthenticatedUser, dto: CreateFinanceTransactionDto) {
    return this.finance.create({
      type: dto.type,
      category: dto.category.trim(),
      description: dto.description.trim(),
      amount: dto.amount,
      reference: dto.reference?.trim() || null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      recordedByUserId: user.id,
    });
  }

  async list(query: FinanceTransactionQueryDto) {
    assertDateRange(query.fromDate, query.toDate);
    const { rows, total } = await this.finance.list({
      skip: query.skip,
      take: query.limit,
      type: query.type,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
    return paginate(rows, total, query);
  }

  async summary(query: FinanceSummaryQueryDto) {
    assertDateRange(query.fromDate, query.toDate);
    const amounts = await this.finance.sumByType({
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
    const income = amounts.find((row) => row.type === 'INCOME')?.amount ?? 0;
    const expenses = amounts.find((row) => row.type === 'EXPENSE')?.amount ?? 0;
    return { income, expenses, balance: income - expenses, currency: 'KES' as const };
  }
}
