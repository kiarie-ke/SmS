'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  reportCardsControllerGenerate,
  reportCardsControllerList,
  reportCardsControllerPublish,
  classesControllerList,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { ReportCardDto } from '@/lib/api/generated/models';

export default function TeacherReportCardsPage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');

  const classesQuery = useApiQuery(['classes', 'mine'], () => classesControllerList({ limit: 100 }));
  const termsQuery = useApiQuery(['terms', 'all'], () => termsControllerList({ limit: 100 }));

  const listQuery = useApiQuery(
    ['report-cards', 'list', classId, termId],
    () => reportCardsControllerList({ classId: classId || undefined, termId: termId || undefined, limit: 100 }),
    { enabled: !!classId && !!termId },
  );

  const generate = useMutation({
    mutationFn: () => reportCardsControllerGenerate({ classId, termId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['report-cards', 'list', classId, termId] });
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) => reportCardsControllerPublish(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['report-cards', 'list', classId, termId] });
    },
  });

  const cards: ReportCardDto[] = listQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Report cards"
        description="Generate, review and publish report cards for a class and term."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Class</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Choose a class…</option>
            {(classesQuery.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Term</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <option value="">Choose a term…</option>
            {(termsQuery.data?.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => generate.mutate()}
          disabled={!classId || !termId || generate.isPending}
        >
          {generate.isPending ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      {generate.error ? (
        <p className="mb-3 text-sm text-red-600">{toErrorMessage(generate.error, 'Could not generate')}</p>
      ) : null}
      {generate.isSuccess ? <p className="mb-3 text-sm text-green-600">Report cards generated.</p> : null}

      {classId && termId ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Student</th>
                <th className="px-3 py-2 text-left font-medium">Overall %</th>
                <th className="px-3 py-2 text-left font-medium">Grade</th>
                <th className="px-3 py-2 text-left font-medium">Rank</th>
                <th className="px-3 py-2 text-left font-medium">Published</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{c.studentName}</td>
                  <td className="px-3 py-2">{c.overallPercentage ?? '—'}</td>
                  <td className="px-3 py-2">{c.overallGrade ?? '—'}</td>
                  <td className="px-3 py-2">
                    {c.rank ?? '—'}/{c.totalStudents ?? '—'}
                  </td>
                  <td className="px-3 py-2">{c.publishedAt ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publish.mutate(c.id)}
                      disabled={!!c.publishedAt || publish.isPending}
                    >
                      Publish
                    </Button>
                  </td>
                </tr>
              ))}
              {cards.length === 0 && !listQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                    No report cards yet. Click Generate.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Choose a class and term.</p>
      )}
    </div>
  );
}
