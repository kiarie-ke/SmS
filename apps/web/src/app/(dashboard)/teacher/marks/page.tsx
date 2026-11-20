'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { EntityDialog, type FieldOption } from '@/components/data-table/entity-dialog';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  examsControllerCreate,
  examsControllerList,
  examsControllerMarks,
  examsControllerPublish,
  examsControllerRegisterMarks,
  classesControllerList,
  subjectsControllerList,
  studentsControllerList,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { CreateExamDto, ExamDto, MarkDto } from '@/lib/api/generated/models';

const EXAM_NAMES = ['CAT1', 'MIDTERM', 'ENDTERM', 'MOCK'] as const;

const examSchema = z.object({
  termId: z.string().uuid('Choose a term'),
  subjectId: z.string().uuid('Choose a subject'),
  classId: z.string().uuid('Choose a class'),
  name: z.enum(EXAM_NAMES),
  maxMarks: z.coerce.number().int().min(1),
  date: z.string().min(1, 'Choose a date'),
});

async function classOptions(): Promise<FieldOption[]> {
  const r = await classesControllerList({ limit: 100 });
  return r.data.map((c) => ({ value: c.id, label: `${c.name} (${c.level})` }));
}
async function subjectOptions(): Promise<FieldOption[]> {
  const r = await subjectsControllerList({ limit: 100 });
  return r.data.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }));
}
async function termOptions(): Promise<FieldOption[]> {
  const r = await termsControllerList({ limit: 100 });
  return r.data.map((t) => ({ value: t.id, label: t.name }));
}

export default function TeacherMarksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const examsQuery = useApiQuery(['exams', 'mine'], () => examsControllerList({ limit: 50 }));

  const marksQuery = useApiQuery(
    ['exams', 'marks', selectedExamId],
    () => examsControllerMarks(selectedExamId),
    { enabled: !!selectedExamId },
  );

  const selectedExam: ExamDto | undefined = (examsQuery.data?.data ?? []).find(
    (e) => e.id === selectedExamId,
  );

  const studentsQuery = useApiQuery(
    ['students', 'for-exam', selectedExam?.classId ?? ''],
    () =>
      studentsControllerList({
        classId: selectedExam!.classId,
        limit: 200,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
    { enabled: !!selectedExam?.classId },
  );

  const students = studentsQuery.data?.data ?? [];
  const existingMarks = new Map<string, MarkDto>((marksQuery.data?.data ?? []).map((m) => [m.studentId, m]));

  const register = useMutation({
    mutationFn: () => {
      const entries = students.map((s) => ({
        studentId: s.id,
        score: Number(scores[s.id] ?? existingMarks.get(s.id)?.score ?? 0),
        teacherComment: comments[s.id]?.trim() || undefined,
      }));
      return examsControllerRegisterMarks(selectedExamId, { entries });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exams', 'marks', selectedExamId] });
    },
  });

  const publish = useMutation({
    mutationFn: () => examsControllerPublish(selectedExamId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exams', 'mine'] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Exams & marks"
        description="Create exams and enter marks. Grades and points are computed by the API."
        actions={<Button onClick={() => setOpen(true)}>New exam</Button>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Exam</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            <option value="">Choose an exam…</option>
            {(examsQuery.data?.data ?? []).map((exam: ExamDto) => (
              <option key={exam.id} value={exam.id}>
                {exam.subjectName} — {exam.name} — {exam.className}
              </option>
            ))}
          </select>
        </label>
        {selectedExam ? (
          <>
            <Button
              onClick={() => register.mutate()}
              disabled={register.isPending || students.length === 0}
            >
              {register.isPending ? 'Saving…' : 'Save marks'}
            </Button>
            <Button
              variant="outline"
              onClick={() => publish.mutate()}
              disabled={publish.isPending || selectedExam.isPublished}
            >
              {selectedExam.isPublished ? 'Published' : 'Publish'}
            </Button>
          </>
        ) : null}
      </div>

      {register.error ? (
        <p className="mb-3 text-sm text-red-600">{toErrorMessage(register.error, 'Could not save marks')}</p>
      ) : null}
      {register.isSuccess ? <p className="mb-3 text-sm text-green-600">Marks saved.</p> : null}

      {selectedExamId && students.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Student</th>
                <th className="px-3 py-2 text-left font-medium">Score (/{selectedExam?.maxMarks})</th>
                <th className="px-3 py-2 text-left font-medium">Grade</th>
                <th className="px-3 py-2 text-left font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const m = existingMarks.get(s.id);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{s.fullName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className="w-24 rounded-md border px-2 py-1 text-sm"
                        defaultValue={m?.score ?? ''}
                        onChange={(e) => setScores((p) => ({ ...p, [s.id]: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">{m?.grade ?? '—'}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border px-2 py-1 text-sm"
                        defaultValue={m?.teacherComment ?? ''}
                        onChange={(e) => setComments((p) => ({ ...p, [s.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : selectedExamId ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : (
        <p className="text-sm text-muted-foreground">Choose an exam to enter marks.</p>
      )}

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title="New exam"
        description="Create an exam for a class and subject."
        fields={[
          { name: 'termId', label: 'Term', type: 'select', options: termOptions },
          { name: 'subjectId', label: 'Subject', type: 'select', options: subjectOptions },
          { name: 'classId', label: 'Class', type: 'select', options: classOptions },
          {
            name: 'name',
            label: 'Exam name',
            type: 'select',
            options: EXAM_NAMES.map((n) => ({ value: n, label: n })),
          },
          { name: 'maxMarks', label: 'Max marks', type: 'number' },
          { name: 'date', label: 'Date', type: 'date' },
        ]}
        schema={examSchema}
        defaultValues={{ maxMarks: 100, name: 'CAT1' }}
        submitLabel="Create exam"
        onSubmit={async (values) => {
          await examsControllerCreate(values as unknown as CreateExamDto);
          await queryClient.invalidateQueries({ queryKey: ['exams', 'mine'] });
          setOpen(false);
        }}
      />
    </div>
  );
}
