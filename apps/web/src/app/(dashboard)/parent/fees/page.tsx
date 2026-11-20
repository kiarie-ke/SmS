'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  feesControllerListInvoices,
  studentsControllerList,
} from '@/lib/api/generated/endpoints';

export default function ParentFeesPage() {
  const [childId, setChildId] = useState('');

  const childrenQuery = useApiQuery(['students', 'children'], () =>
    studentsControllerList({ limit: 100, sortBy: 'firstName', sortOrder: 'asc' }),
  );
  const children: any[] = (childrenQuery.data as any)?.data ?? [];
  const effectiveChild = childId || children[0]?.id || '';

  const invoicesQuery = useApiQuery(
    ['fee-invoices', 'child', effectiveChild],
    () => feesControllerListInvoices({ studentId: effectiveChild, limit: 50 }),
    { enabled: !!effectiveChild },
  );
  const invoices: any[] = (invoicesQuery.data as any)?.data ?? [];

  return (
    <div>
      <PageHeader title="Children's fees" description="View fee invoices for your linked children." />
      <div className="mb-4 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Child</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={effectiveChild}
            onChange={(e) => setChildId(e.target.value)}
          >
            {children.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {c.className}
              </option>
            ))}
          </select>
        </label>
      </div>
      {invoicesQuery.error ? <p className="mb-3 text-sm text-red-600">{toErrorMessage(invoicesQuery.error, 'Could not load')}</p> : null}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Term</th>
              <th className="px-3 py-2 text-left font-medium">Total</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv: any) => (
              <tr key={inv.id} className="border-t">
                <td className="px-3 py-2">{inv.term?.name}</td>
                <td className="px-3 py-2">{inv.totalAmount}</td>
                <td className="px-3 py-2">{inv.status}</td>
              </tr>
            ))}
            {invoices.length === 0 && !invoicesQuery.isLoading ? (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No invoices.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}