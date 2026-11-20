'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  feesControllerListInvoices,
  feesControllerStkPush,
} from '@/lib/api/generated/endpoints';

export default function StudentFeesPage() {
  const [phone, setPhone] = useState('');

  const invoicesQuery = useApiQuery(['fee-invoices', 'mine'], () => feesControllerListInvoices({ limit: 50 }));
  const invoices: any[] = (invoicesQuery.data as any)?.data ?? [];

  const stk = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      feesControllerStkPush(id, { phoneNumber: phone, amount } as any),
  });

  return (
    <div>
      <PageHeader title="My fees" description="View your fee invoices and pay via M-Pesa." />
      <div className="mb-4 flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">M-Pesa phone (2547…)</span>
          <input className="rounded-md border px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254712345678" />
        </label>
      </div>
      {stk.error ? <p className="mb-3 text-sm text-red-600">{toErrorMessage(stk.error, 'STK push failed')}</p> : null}
      {stk.isSuccess ? <p className="mb-3 text-sm text-green-600">STK push sent. Check your phone.</p> : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Term</th>
              <th className="px-3 py-2 text-left font-medium">Total</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv: any) => (
              <tr key={inv.id} className="border-t">
                <td className="px-3 py-2">{inv.term?.name}</td>
                <td className="px-3 py-2">{inv.totalAmount}</td>
                <td className="px-3 py-2">{inv.status}</td>
                <td className="px-3 py-2">
                  {inv.status !== 'PAID' ? (
                    <Button size="sm" onClick={() => stk.mutate({ id: inv.id, amount: inv.totalAmount })} disabled={!phone || stk.isPending}>
                      Pay with M-Pesa
                    </Button>
                  ) : (
                    <span className="text-green-600">Paid</span>
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && !invoicesQuery.isLoading ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No invoices.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}