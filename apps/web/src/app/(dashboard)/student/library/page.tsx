'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { libraryControllerMyLoans } from '@/lib/api/generated/endpoints';
import type { BookLoanDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

function dateLabel(value: string | null): string {
  if (!value) return 'Manual return';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export default function StudentLibraryPage() {
  const [status, setStatus] = useState<'ACTIVE' | 'RETURNED'>('ACTIVE');
  const loansQuery = useApiQuery(['my-library-loans', status], () =>
    libraryControllerMyLoans({ status, limit: 100 }),
  );
  const loans: BookLoanDto[] = loansQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="My library books"
        description="Books issued to you by the school librarian."
      />
      <label className="mb-4 flex w-fit flex-col gap-1 text-sm">
        <span className="font-medium">Loan status</span>
        <select
          className="rounded-md border bg-background px-3 py-2"
          value={status}
          onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'RETURNED')}
        >
          <option value="ACTIVE">Currently issued</option>
          <option value="RETURNED">Returned history</option>
        </select>
      </label>
      {loansQuery.error ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {toErrorMessage(loansQuery.error, 'Could not load your library loans')}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Copy</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loans.map((loan) => (
              <tr key={loan.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{loan.copy.book.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {loan.copy.book.type}
                  </span>
                </td>
                <td className="px-4 py-3">{loan.copy.accessionNumber}</td>
                <td className="px-4 py-3">{dateLabel(loan.issuedAt)}</td>
                <td className="px-4 py-3">{dateLabel(loan.dueAt)}</td>
                <td className="px-4 py-3">
                  {loan.returnedAt ? `Returned ${dateLabel(loan.returnedAt)}` : 'Issued'}
                </td>
              </tr>
            ))}
            {loans.length === 0 && !loansQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {status === 'ACTIVE'
                    ? 'You do not have any books checked out.'
                    : 'No returned books in your history.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
