'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  reportCardsControllerGet,
  reportCardsControllerList,
  studentsControllerList,
} from '@/lib/api/generated/endpoints';
import type { ReportCardDto, StudentDto } from '@/lib/api/generated/models';
import { Printer } from 'lucide-react';

export default function ParentResultsPage() {
  const [childId, setChildId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const childrenQuery = useApiQuery(['students', 'children'], () =>
    studentsControllerList({ limit: 100, sortBy: 'firstName', sortOrder: 'asc' }),
  );
  const children: StudentDto[] = childrenQuery.data?.data ?? [];
  const effectiveChild = childId || children[0]?.id || '';

  const listQuery = useApiQuery(
    ['report-cards', 'child', effectiveChild],
    () => reportCardsControllerList({ studentId: effectiveChild, limit: 50 }),
    { enabled: !!effectiveChild },
  );

  const detailQuery = useApiQuery(
    ['report-cards', 'detail', selectedId],
    () => reportCardsControllerGet(selectedId),
    { enabled: !!selectedId },
  );

  const cards: ReportCardDto[] = listQuery.data?.data ?? [];
  const detail: ReportCardDto | undefined = detailQuery.data?.data;

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Children's academic results" description="Official published term report cards for your linked children." />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Select Child</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                value={effectiveChild}
                onChange={(e) => {
                  setChildId(e.target.value);
                  setSelectedId('');
                }}
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} — {c.className}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Select Academic Term</span>
              <select
                className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Choose a report card…</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.termName} — {c.className}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedId && detail ? (
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          ) : null}
        </div>

        {listQuery.error ? (
          <p className="mb-4 text-sm text-destructive">
            {toErrorMessage(listQuery.error, 'Could not load results')}
          </p>
        ) : null}
      </div>

      {selectedId && detail ? (
        <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm print:border-none print:shadow-none print:p-0">
          {/* Official Report Card Header */}
          <div className="border-b pb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight uppercase">Mwangaza Academy</h1>
            <p className="text-xs italic text-muted-foreground">&quot;Elimu Ni Nuru&quot; • P.O. Box 1234 - 00100, Nairobi, Kenya</p>
            <div className="mt-4 inline-block rounded-md border border-primary/30 bg-primary/5 px-4 py-1 text-sm font-semibold uppercase">
              Official Student Report Card — {detail.termName}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-left text-xs sm:grid-cols-4">
              <div className="rounded border p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-semibold text-sm">{detail.studentName ?? '—'}</span>
              </div>
              <div className="rounded border p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Admission Number</span>
                <span className="font-mono font-semibold text-sm">{detail.admissionNumber ?? '—'}</span>
              </div>
              <div className="rounded border p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Class / Form</span>
                <span className="font-semibold text-sm">{detail.className ?? '—'}</span>
              </div>
              <div className="rounded border p-2.5">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Class Rank</span>
                <span className="font-semibold text-sm text-primary">
                  {detail.rank ? `${detail.rank} of ${detail.totalStudents ?? '—'}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Summary Banner */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <div className="text-xs font-medium text-muted-foreground">Overall Mean Score</div>
              <div className="text-2xl font-bold text-foreground">{detail.overallPercentage ?? '—'}%</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <div className="text-xs font-medium text-muted-foreground">Overall Grade</div>
              <div className="text-2xl font-bold text-primary">{detail.overallGrade ?? '—'}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-lg border bg-muted/30 p-4 text-center">
              <div className="text-xs font-medium text-muted-foreground">Total Points</div>
              <div className="text-2xl font-bold text-foreground">{detail.overallPoints ?? '—'}</div>
            </div>
          </div>

          {/* Marks & Subjects Breakdown */}
          {detail.marks && detail.marks.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Subject Performance Breakdown
              </h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Exam</th>
                      <th className="px-4 py-2.5">Score</th>
                      <th className="px-4 py-2.5">Percentage</th>
                      <th className="px-4 py-2.5">Grade</th>
                      <th className="px-4 py-2.5">Points</th>
                      <th className="px-4 py-2.5">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.marks.map((m, i) => {
                      const pct = m.maxMarks > 0 ? ((m.score / m.maxMarks) * 100).toFixed(0) : '0';
                      return (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{m.subjectName}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.examName}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">
                            {m.score} / {m.maxMarks}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">{pct}%</td>
                          <td className="px-4 py-2.5 font-bold text-xs">{m.grade}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{m.points ?? '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.remarks ?? 'Good performance'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* CBC Competencies */}
          {detail.cbcAssessments && detail.cbcAssessments.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Competency Based Curriculum (CBC) Outcomes
              </h2>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Learning Outcome</th>
                      <th className="px-4 py-2.5">Level</th>
                      <th className="px-4 py-2.5">Observation Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.cbcAssessments.map((c, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-medium">{c.subjectName}</td>
                        <td className="px-4 py-2.5">{c.learningOutcomeDescription}</td>
                        <td className="px-4 py-2.5 font-semibold text-xs text-primary">{c.performanceLevel}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.teacherComment ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Remarks and Sign-off */}
          <div className="mt-8 border-t pt-6 space-y-6">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Teacher Remarks:</span>
              <p className="text-sm font-medium">{detail.teacherRemarks || 'Satisfactory academic progress. Encouraged to aim higher.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 text-xs">
              <div className="border-t border-dashed pt-2">
                <span className="font-semibold text-muted-foreground">Class Teacher Signature</span>
              </div>
              <div className="border-t border-dashed pt-2 text-right">
                <span className="font-semibold text-muted-foreground">Principal / Headteacher Stamp</span>
              </div>
            </div>
          </div>
        </div>
      ) : selectedId && detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report card details…</p>
      ) : null}
    </div>
  );
}
