'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  reportsControllerSummary,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { ReportSummaryDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const money = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 2,
});

function csvCell(value: string | number | null): string {
  const text = String(value ?? '');
  const protectedText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | null)[][],
) {
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function CsvButton({
  filename,
  header,
  rows,
}: {
  filename: string;
  header: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, header, rows)}
    >
      <Download aria-hidden />
      Export CSV
    </Button>
  );
}

function ReportTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return rows.length === 0 ? (
    <p className="text-sm text-muted-foreground">No records for this period.</p>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            {headers.map((header) => (
              <th className="px-2 py-2 font-medium" key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-b last:border-0" key={`${String(row[0])}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td className="px-2 py-2" key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function reportRows(report: ReportSummaryDto) {
  const academicRows = [
    ...report.academics.map((row) => [
      `Grade ${row.grade}`,
      row.count,
      row.averageScore === null ? '' : row.averageScore.toFixed(2),
    ] as (string | number)[]),
    ...report.cbcAssessments.map((row) => [
      row.performanceLevel,
      row.count,
      '',
    ] as (string | number)[]),
  ];

  return {
    enrollment: report.enrollment.map((row) => [
      row.className,
      row.classLevel,
      row.studentCount,
    ]),
    attendance: report.attendance.map((row) => [row.status, row.count]),
    academics: academicRows,
    fees: report.fees.map((row) => [
      row.status,
      row.invoiceCount,
      row.billedAmount.toFixed(2),
    ]),
  };
}

export default function AdminReportsPage() {
  const [termId, setTermId] = useState('');
  const termsQuery = useApiQuery(
    ['report-terms'],
    () => termsControllerList({ limit: 100, sortBy: 'startDate', sortOrder: 'desc' }),
  );
  const terms = termsQuery.data?.data ?? [];

  useEffect(() => {
    if (!termId) {
      setTermId(terms.find((term) => term.isCurrent)?.id ?? '');
    }
  }, [termId, terms]);

  const reportQuery = useApiQuery(
    ['admin-report-summary', termId],
    () => reportsControllerSummary(termId ? { termId } : {}),
  );
  const report = reportQuery.data?.data;
  const rows = report ? reportRows(report) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="School reports"
        description="Review enrollment, attendance, academic performance and fee collection."
        actions={
          <label className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Report term</span>
            <select
              aria-label="Report term"
              className="h-9 rounded-md border border-input bg-background px-3"
              value={termId}
              onChange={(event) => setTermId(event.target.value)}
              disabled={termsQuery.isLoading}
            >
              {!terms.some((term) => term.isCurrent) ? (
                <option value="">All available records</option>
              ) : null}
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.academicYearName} · {term.name}{term.isCurrent ? ' (Current)' : ''}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {termsQuery.error ? (
        <p role="alert" className="text-sm text-destructive">
          {toErrorMessage(termsQuery.error, 'Could not load academic terms')}
        </p>
      ) : null}

      {report?.term ? (
        <p className="text-sm text-muted-foreground">
          Showing term data for <span className="font-medium text-foreground">{report.term.academicYearName} · {report.term.name}</span>
          {' '}({report.term.startDate} – {report.term.endDate})
        </p>
      ) : null}

      {reportQuery.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading reports…</p>
      ) : reportQuery.error ? (
        <p role="alert" className="text-sm text-destructive">
          {toErrorMessage(reportQuery.error, 'Could not load school reports')}
        </p>
      ) : report && rows ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Enrollment</CardTitle>
                  <CardDescription>{report.totalStudents} active students by class</CardDescription>
                </div>
                <CsvButton
                  filename="enrollment-report.csv"
                  header={['Class', 'Level', 'Students']}
                  rows={rows.enrollment}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ReportTable headers={['Class', 'Level', 'Students']} rows={rows.enrollment} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Attendance</CardTitle>
                  <CardDescription>
                    {report.attendanceRate}% present or late across {report.attendanceRecords} marks
                  </CardDescription>
                </div>
                <CsvButton
                  filename="attendance-report.csv"
                  header={['Status', 'Count']}
                  rows={rows.attendance}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ReportTable headers={['Status', 'Count']} rows={rows.attendance} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Academic performance</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    {report.marksRecorded} marks · {report.averageScore === null ? 'No numeric marks' : `Average ${report.averageScore.toFixed(1)}%`}
                    <Badge variant="secondary">{report.publishedReportCards} published report cards</Badge>
                  </CardDescription>
                </div>
                <CsvButton
                  filename="academic-report.csv"
                  header={['Grade / CBC level', 'Count', 'Average score']}
                  rows={rows.academics}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ReportTable
                headers={['Grade / CBC level', 'Count', 'Average score']}
                rows={rows.academics}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Fees</CardTitle>
                  <CardDescription>
                    {report.invoiceCount} invoices · {money.format(report.collectedAmount)} collected · {money.format(report.outstandingAmount)} outstanding
                  </CardDescription>
                </div>
                <CsvButton
                  filename="fees-report.csv"
                  header={['Status', 'Invoices', 'Amount billed (KES)']}
                  rows={rows.fees}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ReportTable
                headers={['Status', 'Invoices', 'Amount billed (KES)']}
                rows={rows.fees}
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Total billed: {money.format(report.billedAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
