'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  classesControllerList,
  feesControllerListInvoices,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { ClassDto, TermDto } from '@/lib/api/generated/models';

export default function TeacherFeesPage() {
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');

  const classesQuery = useApiQuery(['classes', 'teacher'], () =>
    classesControllerList({ limit: 100 }),
  );
  const termsQuery = useApiQuery(['terms', 'all'], () => termsControllerList({ limit: 100 }));

  const classes: ClassDto[] = classesQuery.data?.data ?? [];
  const terms: TermDto[] = termsQuery.data?.data ?? [];

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!termId && terms.length > 0) {
      const current = terms.find((t) => t.isCurrent) ?? terms[0];
      setTermId(current.id);
    }
  }, [terms, termId]);

  const invoicesQuery = useApiQuery(
    ['fee-invoices', 'teacher', classId, termId],
    () =>
      feesControllerListInvoices({
        classId: classId || undefined,
        termId: termId || undefined,
        limit: 100,
      }),
    { enabled: !!classId && !!termId },
  );

  const invoices: any[] = (invoicesQuery.data as any)?.data ?? [];

  const paidCount = invoices.filter((i) => i.status === 'PAID').length;
  const partialCount = invoices.filter((i) => i.status === 'PARTIAL').length;
  const unpaidCount = invoices.filter((i) => i.status === 'UNPAID').length;

  return (
    <div>
      <PageHeader
        title="Class fee clearance"
        description="Monitor fee payment and clearance status for students in your assigned classes."
      />

      <div className="mb-6 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Class</span>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Term</span>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isCurrent ? '• Current' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {invoices.length > 0 ? (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground font-medium">Cleared (Paid)</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {paidCount}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground font-medium">Partial Payment</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {partialCount}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground font-medium">Unpaid Balance</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {unpaidCount}
            </div>
          </div>
        </div>
      ) : null}

      {invoicesQuery.error ? (
        <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {toErrorMessage(invoicesQuery.error, 'Could not load fee records')}
        </div>
      ) : null}

      {classId && termId ? (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Adm No.</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Total Invoiced</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{inv.student?.admissionNumber}</td>
                  <td className="px-4 py-3 font-medium">
                    {inv.student?.firstName} {inv.student?.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 font-mono font-medium">
                    KES {Number(inv.totalAmount).toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : inv.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && !invoicesQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No student fee records found for this class and term.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
