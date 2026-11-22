import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/auth-user';
import {
  FinanceRepositoryPort,
  type FinanceTransactionCreateData,
  type FinanceTransactionRecord,
} from './finance.repository';
import { FinanceService } from './finance.service';

const BURSAR: AuthenticatedUser = {
  id: 'bursar-1',
  email: 'bursar@example.ac.ke',
  phone: '+254700000002',
  role: 'BURSAR',
};

class FakeFinanceRepository extends FinanceRepositoryPort {
  rows: FinanceTransactionRecord[] = [];

  async create(data: FinanceTransactionCreateData) {
    const row: FinanceTransactionRecord = {
      id: `tx-${this.rows.length + 1}`,
      ...data,
      createdAt: new Date(),
      recordedBy: { email: BURSAR.email },
    };
    this.rows.push(row);
    return row;
  }

  async list() {
    return { rows: this.rows, total: this.rows.length };
  }

  async sumByType() {
    return (['INCOME', 'EXPENSE'] as const).map((type) => ({
      type,
      amount: this.rows
        .filter((row) => row.type === type)
        .reduce((sum, row) => sum + row.amount, 0),
    }));
  }
}

describe('FinanceService', () => {
  let repo: FakeFinanceRepository;
  let service: FinanceService;

  beforeEach(() => {
    repo = new FakeFinanceRepository();
    service = new FinanceService(repo);
  });

  it('records non-fee income and expenses and summarizes a net balance', async () => {
    await service.create(BURSAR, {
      type: 'INCOME',
      category: 'Donation',
      description: 'Alumni donation',
      amount: 25000,
    });
    await service.create(BURSAR, {
      type: 'EXPENSE',
      category: 'Utilities',
      description: 'Water bill',
      amount: 3500,
    });

    await expect(service.summary({})).resolves.toEqual({
      income: 25000,
      expenses: 3500,
      balance: 21500,
      currency: 'KES',
    });
    expect(repo.rows[0].recordedByUserId).toBe(BURSAR.id);
  });

  it('rejects reversed date ranges for finance reports', async () => {
    await expect(
      service.summary({ fromDate: '2026-12-31', toDate: '2026-01-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
