'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';
import {
  attendanceControllerStudentAttendance,
  attendanceControllerStudentSummary,
  studentsControllerList,
} from '@/lib/api/generated/endpoints';
import type { AttendanceDto, StudentDto } from '@/lib/api/generated/models';

function nairobiToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(
    new Date(),
  );
}

export default function ParentAttendancePage() {
  const [childId, setChildId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(nairobiToday());

  const childrenQuery = useApiQuery(['students', 'children'], () =>
    studentsControllerList({ limit: 100, sortBy: 'firstName', sortOrder: 'asc' }),
  );

  const children: StudentDto[] = childrenQuery.data?.data ?? [];
  const selectedId = childId || children[0]?.id || '';

  const historyQuery = useApiQuery(
    ['attendance', 'student', selectedId, from, to],
    () => attendanceControllerStudentAttendance(selectedId, { from, to }),
    { enabled: !!selectedId },
  );

  const summaryQuery = useApiQuery(
    ['attendance', 'student-summary', selectedId, from, to],
    () => attendanceControllerStudentSummary(selectedId, { from, to }),
    { enabled: !!selectedId },
  );

  const rows: AttendanceDto[] = historyQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Children's attendance"
        description="Attendance for the children linked to your account."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Child</span>
          <select
            className="rounded-md border px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setChildId(e.target.value)}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.fullName} — {child.className}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">From</span>
          <input
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">To</span>
          <input
            type="date"
            className="rounded-md border px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      {childrenQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading children…</p>
      ) : children.length === 0 ? (
        <p className="text-sm text-muted-foreground">No children linked to your account.</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {summaryQuery.data?.data ? (
              <>
                <Stat label="Present" value={summaryQuery.data.data.present} />
                <Stat label="Absent" value={summaryQuery.data.data.absent} />
                <Stat label="Late" value={summaryQuery.data.data.late} />
                <Stat label="Excused" value={summaryQuery.data.data.excused} />
                <Stat label="Attendance %" value={`${summaryQuery.data.data.percentage}%`} />
              </>
            ) : null}
          </div>

          {historyQuery.error ? (
            <p className="mb-3 text-sm text-red-600">
              {toErrorMessage(historyQuery.error, 'Could not load attendance')}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.remarks ?? '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && !historyQuery.isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                      No attendance records in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
