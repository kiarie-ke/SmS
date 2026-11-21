'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  cbcControllerList,
  cbcControllerListLearningOutcomes,
  cbcControllerRegister,
  classesControllerList,
  studentsControllerList,
  subjectsControllerList,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type {
  CbcAssessmentDto,
  CbcBulkEntryDtoPerformanceLevel,
  ClassDto,
  LearningOutcomeDto,
  StudentDto,
  SubjectDto,
  TermDto,
} from '@/lib/api/generated/models';

const PERFORMANCE_LEVELS: {
  level: CbcBulkEntryDtoPerformanceLevel;
  label: string;
  badgeClass: string;
}[] = [
  { level: 'EE', label: 'EE (Exceeding)', badgeClass: 'border-emerald-600 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40' },
  { level: 'ME', label: 'ME (Meeting)', badgeClass: 'border-blue-600 text-blue-700 bg-blue-50 dark:bg-blue-950/40' },
  { level: 'AE', label: 'AE (Approaching)', badgeClass: 'border-amber-600 text-amber-700 bg-amber-50 dark:bg-amber-950/40' },
  { level: 'BE', label: 'BE (Below)', badgeClass: 'border-rose-600 text-rose-700 bg-rose-50 dark:bg-rose-950/40' },
];

export default function TeacherCbcPage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [learningOutcomeId, setLearningOutcomeId] = useState('');

  const [levels, setLevels] = useState<Record<string, CbcBulkEntryDtoPerformanceLevel>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const classesQuery = useApiQuery(['classes', 'teacher'], () => classesControllerList({ limit: 100 }));
  const termsQuery = useApiQuery(['terms', 'all'], () => termsControllerList({ limit: 100 }));
  const subjectsQuery = useApiQuery(['subjects', 'all'], () => subjectsControllerList({ limit: 100 }));
  const outcomesQuery = useApiQuery(
    ['cbc', 'learning-outcomes', subjectId],
    () => cbcControllerListLearningOutcomes(subjectId ? { subjectId } : {}),
    { enabled: !!subjectId },
  );

  const classes: ClassDto[] = classesQuery.data?.data ?? [];
  const terms: TermDto[] = termsQuery.data?.data ?? [];
  const subjects: SubjectDto[] = subjectsQuery.data?.data ?? [];
  const outcomes: LearningOutcomeDto[] = (outcomesQuery.data as any)?.data ?? [];

  // Default selections
  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  useEffect(() => {
    if (!termId && terms.length > 0) {
      const current = terms.find((t) => t.isCurrent) ?? terms[0];
      setTermId(current.id);
    }
  }, [terms, termId]);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  useEffect(() => {
    if (outcomes.length > 0 && (!learningOutcomeId || !outcomes.some((o) => o.id === learningOutcomeId))) {
      const firstId = outcomes[0]?.id;
      if (firstId) setLearningOutcomeId(firstId);
    }
  }, [outcomes, learningOutcomeId]);

  const studentsQuery = useApiQuery(
    ['students', 'by-class', classId],
    () => studentsControllerList({ classId, limit: 100, sortBy: 'firstName', sortOrder: 'asc' }),
    { enabled: !!classId },
  );
  const students: StudentDto[] = studentsQuery.data?.data ?? [];

  const existingAssessmentsQuery = useApiQuery(
    ['cbc', 'existing', classId, termId, learningOutcomeId],
    () => cbcControllerList({ classId, termId, learningOutcomeId, limit: 100 }),
    { enabled: !!classId && !!termId && !!learningOutcomeId },
  );
  const existingAssessments: CbcAssessmentDto[] = (existingAssessmentsQuery.data as any)?.data ?? [];

  // Populate state when existing assessments load
  useEffect(() => {
    if (existingAssessments.length > 0) {
      const lvlMap: Record<string, CbcBulkEntryDtoPerformanceLevel> = {};
      const cmtMap: Record<string, string> = {};
      for (const a of existingAssessments) {
        lvlMap[a.studentId] = a.performanceLevel as CbcBulkEntryDtoPerformanceLevel;
        if (a.teacherComment) cmtMap[a.studentId] = a.teacherComment;
      }
      setLevels((prev) => ({ ...prev, ...lvlMap }));
      setComments((prev) => ({ ...prev, ...cmtMap }));
    }
  }, [existingAssessments]);

  const registerMutation = useMutation({
    mutationFn: () => {
      const entries = students
        .filter((s) => levels[s.id])
        .map((s) => ({
          studentId: s.id,
          learningOutcomeId,
          performanceLevel: levels[s.id],
          teacherComment: comments[s.id]?.trim() || undefined,
        }));
      return cbcControllerRegister({ termId, entries });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['cbc', 'existing', classId, termId, learningOutcomeId],
      });
    },
  });

  return (
    <div>
      <PageHeader
        title="CBC assessments"
        description="Record Competency Based Curriculum (CBC) performance levels (EE, ME, AE, BE) per learning outcome."
      />

      <div className="mb-6 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Subject</span>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">Learning outcome</span>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
            value={learningOutcomeId}
            onChange={(e) => setLearningOutcomeId(e.target.value)}
            disabled={outcomes.length === 0}
          >
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.strandName}: {o.description}
              </option>
            ))}
            {outcomes.length === 0 ? <option value="">No outcomes for subject</option> : null}
          </select>
        </label>
      </div>

      {registerMutation.error ? (
        <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {toErrorMessage(registerMutation.error, 'Could not save assessments')}
        </div>
      ) : null}

      {registerMutation.isSuccess ? (
        <div className="mb-4 rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          CBC assessments successfully saved.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Adm No.</th>
              <th className="px-4 py-3">Student Name</th>
              <th className="px-4 py-3">Performance Level</th>
              <th className="px-4 py-3">Teacher Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student) => {
              const currentLevel = levels[student.id];
              return (
                <tr key={student.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{student.admissionNumber}</td>
                  <td className="px-4 py-3 font-medium">{student.fullName}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PERFORMANCE_LEVELS.map(({ level, label, badgeClass }) => {
                        const active = currentLevel === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setLevels((prev) => ({ ...prev, [student.id]: level }))}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                              active
                                ? `${badgeClass} ring-2 ring-primary ring-offset-1`
                                : 'border-input bg-background text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      className="w-full rounded-md border bg-background px-2.5 py-1 text-xs"
                      placeholder="Observation remark (optional)"
                      value={comments[student.id] ?? ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [student.id]: e.target.value }))}
                    />
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && !studentsQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No students in this class.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => registerMutation.mutate()}
          disabled={!termId || !learningOutcomeId || students.length === 0 || registerMutation.isPending}
        >
          {registerMutation.isPending ? 'Saving…' : 'Save assessments'}
        </Button>
      </div>
    </div>
  );
}
