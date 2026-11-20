'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  attendanceControllerClassSummary,
  attendanceControllerList,
  attendanceControllerRegister,
  classesControllerList,
  studentsControllerList,
} from '@/lib/api/generated/endpoints';
import type { AttendanceDto, ClassDto, StudentDto } from '@/lib/api/generated/models';

const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const;
type Status = (typeof STATUSES)[number];

function nairobiToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(
    new Date(),
  );
}

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(nairobiToday());
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [showSummary, setShowSummary] = useState(false);

  const classesQuery = useApiQuery(['classes', 'mine', 'attendance'], () =>
    classesControllerList({ limit: 100 }),
  );

  const studentsQuery = useApiQuery(
    ['students', 'by-class', classId],
    () => studentsControllerList({ classId, limit: 200, sortBy: 'lastName', sortOrder: 'asc' }),
    { enabled: !!classId },
  );

  const attendanceQuery = useApiQuery(
    ['attendance', classId, date],
    () => attendanceControllerList({ classId, date }),
    { enabled: !!classId && !!date },
  );

  const summaryQuery = useApiQuery(
    ['attendance', 'class-summary', classId, date],
    () =>
      attendanceControllerClassSummary(classId, {
        from: date,
        to: date,
      }),
    { enabled: !!classId && !!date && showSummary },
  );

  // initialise form state from existing attendance / defaults
  useEffect(() => {
    const students = studentsQuery.data?.data ?? [];
    const existing = new Map<string, AttendanceDto>(
      (attendanceQuery.data?.data ?? []).map((row) => [row.studentId, row]),
    );
    const nextStatus: Record<string, Status> = {};
    const nextRemarks: Record<string, string> = {};
    for (const student of students) {
      const row = existing.get(student.id);
      nextStatus[student.id] = (row?.status as Status) ?? 'PRESENT';
      nextRemarks[student.id] = row?.remarks ?? '';
    }
    setStatuses(nextStatus);
    setRemarks(nextRemarks);
  }, [studentsQuery.data, attendanceQuery.data]);

  const register = useMutation({
    mutationFn: () => {
      const students = studentsQuery.data?.data ?? [];
      return attendanceControllerRegister({
        classId,
        date,
        entries: students.map((student) => ({
          studentId: student.id,
          status: statuses[student.id] ?? 'PRESENT',
          remarks: remarks[student.id]?.trim() || undefined,
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', classId, date] });
    },
  });

  const students: StudentDto[] = studentsQuery.data?.data ?? [];

  const allPresent = () => {
    const next: Record<string, Status> = {};
    for (const s of students) next[s.id] = 'PRESENT';
    setStatuses(next);
  };

  return (
    <div>
      <PageHeader
        title="Daily attendance register"
        description="Mark presence for a class on a given date. Re-submitting overwrites the existing register (idempotent)."
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
            {(classesQuery.data?.data ?? []).map((klass: ClassDto) => (
              <option key={klass.id} value={klass.id}>
                {klass.name} ({klass.level})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Date</span>
          <input
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button
          variant="outline"
          onClick={allPresent}
          disabled={students.length === 0}
        >
          Mark all present
        </Button>
        <Button
          onClick={() => register.mutate()}
          disabled={students.length === 0 || register.isPending}
        >
          {register.isPending ? 'Saving…' : 'Save register'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowSummary((v) => !v)}
          disabled={!classId}
        >
          {showSummary ? 'Hide summary' : 'Show summary'}
        </Button>
      </div>

      {register.error ? (
        <p className="mb-3 text-sm text-red-600">
          {toErrorMessage(register.error, 'Could not save register')}
        </p>
      ) : null}
      {register.isSuccess ? (
        <p className="mb-3 text-sm text-green-600">Register saved.</p>
      ) : null}

      {!classId ? (
        <p className="text-sm text-muted-foreground">Choose a class to load the register.</p>
      ) : studentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading students…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students in this class.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Student</th>
                <th className="px-3 py-2 text-left font-medium">Admission</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{student.fullName}</td>
                  <td className="px-3 py-2">{student.admissionNumber}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border px-2 py-1 text-sm"
                      value={statuses[student.id] ?? 'PRESENT'}
                      onChange={(e) =>
                        setStatuses((prev) => ({
                          ...prev,
                          [student.id]: e.target.value as Status,
                        }))
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1 text-sm"
                      value={remarks[student.id] ?? ''}
                      onChange={(e) =>
                        setRemarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                      }
                      placeholder="Optional"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSummary && classId ? (
        <div className="mt-6">
          <h2 className="mb-2 text-base font-semibold">Class summary ({date})</h2>
          {summaryQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading summary…</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Student</th>
                    <th className="px-3 py-2 text-left font-medium">Present</th>
                    <th className="px-3 py-2 text-left font-medium">Absent</th>
                    <th className="px-3 py-2 text-left font-medium">Late</th>
                    <th className="px-3 py-2 text-left font-medium">Excused</th>
                    <th className="px-3 py-2 text-left font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(summaryQuery.data?.data ?? []).map((row) => (
                    <tr key={row.studentId} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        {row.firstName} {row.lastName}
                      </td>
                      <td className="px-3 py-2">{row.present}</td>
                      <td className="px-3 py-2">{row.absent}</td>
                      <td className="px-3 py-2">{row.late}</td>
                      <td className="px-3 py-2">{row.excused}</td>
                      <td className="px-3 py-2">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
