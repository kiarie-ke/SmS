'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  classesControllerList,
  feesControllerCreateStructure,
  feesControllerGenerate,
  feesControllerListInvoices,
  feesControllerListStructures,
  feesControllerRecordPayment,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { ClassDto, TermDto } from '@/lib/api/generated/models';

const FEE_CATEGORIES = [
  'TUITION',
  'BOARDING',
  'ACTIVITY',
  'TRANSPORT',
  'LUNCH',
  'UNIFORM',
  'OTHER',
] as const;

export function FeesManagementPage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');

  // Create structure dialog state
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [newClassId, setNewClassId] = useState('');
  const [newTermId, setNewTermId] = useState('');
  const [category, setCategory] = useState<(typeof FEE_CATEGORIES)[number]>('TUITION');
  const [amount, setAmount] = useState('15000');
  const [isMandatory, setIsMandatory] = useState(true);

  // Queries
  const classesQuery = useApiQuery(['classes', 'all'], () => classesControllerList({ limit: 100 }));
  const termsQuery = useApiQuery(['terms', 'all'], () => termsControllerList({ limit: 100 }));

  const classes: ClassDto[] = classesQuery.data?.data ?? [];
  const terms: TermDto[] = termsQuery.data?.data ?? [];

  // Default selections
  useEffect(() => {
    if (!classId && classes.length > 0) {
      setClassId(classes[0].id);
      setNewClassId(classes[0].id);
    }
  }, [classes, classId]);

  useEffect(() => {
    if (!termId && terms.length > 0) {
      const current = terms.find((t) => t.isCurrent) ?? terms[0];
      setTermId(current.id);
      setNewTermId(current.id);
    }
  }, [terms, termId]);

  const structuresQuery = useApiQuery(['fee-structures'], () =>
    feesControllerListStructures({ limit: 100 }),
  );
  const invoicesQuery = useApiQuery(
    ['fee-invoices', classId, termId],
    () =>
      feesControllerListInvoices({
        classId: classId || undefined,
        termId: termId || undefined,
        limit: 100,
      }),
    { enabled: !!classId && !!termId },
  );

  const structures: any[] = (structuresQuery.data as any)?.data ?? [];
  const invoices: any[] = (invoicesQuery.data as any)?.data ?? [];

  // Mutations
  const generate = useMutation({
    mutationFn: () => feesControllerGenerate({ classId, termId } as any),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fee-invoices', classId, termId] });
    },
  });

  const recordPayment = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      feesControllerRecordPayment(id, { amount, method: 'CASH' } as any),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fee-invoices', classId, termId] });
    },
  });

  const createStructureMutation = useMutation({
    mutationFn: () =>
      feesControllerCreateStructure({
        classId: newClassId,
        termId: newTermId,
        category,
        amount: Number(amount) || 0,
        isMandatory,
      } as any),
    onSuccess: async () => {
      setShowStructureDialog(false);
      await queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Fees & billing"
          description="Manage fee structures, generate student invoices, and record payments."
        />
        <Button onClick={() => setShowStructureDialog(true)}>+ Add fee structure</Button>
      </div>

      {/* Fee Structures Section */}
      <div className="mb-8">
        <h2 className="mb-2 text-base font-semibold">Active fee structures</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount (KES)</th>
                <th className="px-4 py-3">Mandatory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {structures.map((s: any) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{s.class?.name ?? '—'}</td>
                  <td className="px-4 py-3">{s.term?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-input bg-background px-2 py-0.5 text-xs font-mono font-medium">
                      {s.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium">
                    KES {Number(s.amount).toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.isMandatory ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">Optional</span>
                    )}
                  </td>
                </tr>
              ))}
              {structures.length === 0 && !structuresQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No fee structures defined yet. Click &quot;+ Add fee structure&quot; to create one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Generation & Invoices Table */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Class invoices & payments</h2>

        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
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

          <Button
            onClick={() => generate.mutate()}
            disabled={!classId || !termId || generate.isPending}
          >
            {generate.isPending ? 'Generating…' : 'Generate class invoices'}
          </Button>
        </div>

        {generate.error ? (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {toErrorMessage(generate.error, 'Could not generate invoices')}
          </div>
        ) : null}

        {generate.isSuccess ? (
          <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            Invoices successfully generated/updated for the selected class and term.
          </div>
        ) : null}

        {classId && termId ? (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Adm No.</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Invoice No.</th>
                  <th className="px-4 py-3">Total (KES)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
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
                    <td className="px-4 py-3 text-right">
                      {inv.status !== 'PAID' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            recordPayment.mutate({ id: inv.id, amount: inv.totalAmount })
                          }
                          disabled={recordPayment.isPending}
                        >
                          Mark paid (cash)
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && !invoicesQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No invoices found for this class and term. Click &quot;Generate class invoices&quot; to create them.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Create Fee Structure Dialog */}
      {showStructureDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Create fee structure</h3>
                <p className="text-xs text-muted-foreground">Define fees charged to a class for a specific term.</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowStructureDialog(false)}>
                ✕
              </Button>
            </div>

            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Class</span>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Term</span>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={newTermId}
                  onChange={(e) => setNewTermId(e.target.value)}
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isCurrent ? '• Current' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Category</span>
                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  {FEE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Amount (KES)</span>
                <input
                  type="number"
                  className="rounded-md border bg-background px-3 py-2 text-sm font-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="20000"
                />
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="font-medium">Mandatory fee item</span>
              </label>
            </div>

            {createStructureMutation.error ? (
              <p className="text-xs text-destructive">
                {toErrorMessage(createStructureMutation.error, 'Could not create structure')}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowStructureDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => createStructureMutation.mutate()}
                disabled={!newClassId || !newTermId || !amount || createStructureMutation.isPending}
              >
                {createStructureMutation.isPending ? 'Saving…' : 'Save structure'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
