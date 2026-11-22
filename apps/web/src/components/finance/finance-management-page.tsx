'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  financeControllerCreate,
  financeControllerList,
  financeControllerSummary,
} from '@/lib/api/generated/endpoints';
import type {
  CreateFinanceTransactionDto,
  FinanceTransactionDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const INITIAL_TRANSACTION: CreateFinanceTransactionDto = {
  type: 'INCOME',
  category: '',
  description: '',
  amount: 0,
};

function kes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateLabel(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function FinanceManagementPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INITIAL_TRANSACTION);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const summaryQuery = useApiQuery(
    ['finance-summary', fromDate, toDate],
    () =>
      financeControllerSummary({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  );
  const transactionsQuery = useApiQuery(
    ['finance-transactions', fromDate, toDate],
    () =>
      financeControllerList({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: 1,
        limit: 100,
      }),
  );

  const create = useMutation({
    mutationFn: (transaction: CreateFinanceTransactionDto) =>
      financeControllerCreate(transaction),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finance-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finance-transactions'] }),
      ]);
      setForm(INITIAL_TRANSACTION);
    },
  });

  const summary = summaryQuery.data?.data;
  const transactions: FinanceTransactionDto[] = transactionsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other finances"
        description="Record non-fee income and operating expenses. Fee payments remain in the Fees module."
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">From</span>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">To</span>
          <input
            type="date"
            className="rounded-md border bg-background px-3 py-2"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <Button
          variant="outline"
          onClick={() => {
            setFromDate('');
            setToDate('');
          }}
        >
          All dates
        </Button>
      </div>

      {summaryQuery.error ? (
        <p role="alert" className="text-sm text-destructive">
          {toErrorMessage(summaryQuery.error, 'Could not load finance summary')}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Other income', amount: summary?.income ?? 0 },
          { label: 'Operating expenses', amount: summary?.expenses ?? 0 },
          { label: 'Net balance', amount: summary?.balance ?? 0 },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold tabular-nums">
              {summaryQuery.isLoading ? 'Loading…' : kes(item.amount)}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 text-base font-semibold">Record a transaction</h2>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(form);
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Type</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as CreateFinanceTransactionDto['type'] })
              }
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Category</span>
            <input
              required
              maxLength={60}
              className="rounded-md border bg-background px-3 py-2"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Donations, utilities, supplies…"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Amount (KES)</span>
            <input
              required
              type="number"
              min="0.01"
              max="999999999"
              step="0.01"
              className="rounded-md border bg-background px-3 py-2"
              value={form.amount || ''}
              onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Description</span>
            <input
              required
              maxLength={500}
              className="rounded-md border bg-background px-3 py-2"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What was received or paid for?"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Reference (optional)</span>
            <input
              maxLength={100}
              className="rounded-md border bg-background px-3 py-2"
              value={form.reference ?? ''}
              onChange={(event) => setForm({ ...form, reference: event.target.value || undefined })}
              placeholder="Receipt or voucher number"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Transaction date</span>
            <input
              type="date"
              className="rounded-md border bg-background px-3 py-2"
              value={form.occurredAt ?? ''}
              onChange={(event) => setForm({ ...form, occurredAt: event.target.value || undefined })}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending || form.amount <= 0}>
              {create.isPending ? 'Saving…' : 'Save transaction'}
            </Button>
          </div>
        </form>
        {create.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(create.error, 'Could not save transaction')}
          </p>
        ) : null}
        {create.isSuccess ? (
          <p className="mt-3 text-sm text-emerald-700">Transaction recorded.</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Transaction history</h2>
        {transactionsQuery.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {toErrorMessage(transactionsQuery.error, 'Could not load transactions')}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Category / description</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Recorded by</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-3">{dateLabel(transaction.occurredAt)}</td>
                  <td className="px-4 py-3">{transaction.type}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{transaction.category}</span>
                    <span className="block text-xs text-muted-foreground">
                      {transaction.description}
                    </span>
                  </td>
                  <td className="px-4 py-3">{transaction.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">{kes(transaction.amount)}</td>
                  <td className="px-4 py-3">{transaction.recordedBy.email}</td>
                </tr>
              ))}
              {transactions.length === 0 && !transactionsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No transactions in this date range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
