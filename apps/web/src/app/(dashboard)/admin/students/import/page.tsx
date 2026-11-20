'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, FileUp } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { studentsControllerImportCsv } from '@/lib/api/generated/endpoints';
import type { ImportStudentsResultDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';

const TEMPLATE =
  'admissionNumber,upi,firstName,lastName,gender,dateOfBirth,county,subCounty,className,streamName,boardingStatus\n' +
  'ADM-2027-001,200100009999,Amina,Wanjiru,FEMALE,2013-04-12,Nairobi,Westlands,Form 3 South,Main,DAY\n';

export default function StudentImportPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportStudentsResultDto | null>(null);

  const upload = useMutation({
    mutationFn: (csv: File) => studentsControllerImportCsv({ file: csv }),
    onSuccess: async (response) => {
      setResult(response.data);
      await queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Link
        href="/admin/students"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to students
      </Link>

      <PageHeader
        title="Import students"
        description="Upload a CSV. Rows are validated individually — one bad row does not stop the batch."
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" /> Download template
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Choose the file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Required columns: admissionNumber, upi, firstName, lastName, gender,
              dateOfBirth, county, subCounty. Provide <code>className</code> (or{' '}
              <code>classId</code>); <code>streamName</code> and{' '}
              <code>boardingStatus</code> are optional. Up to 500 rows.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              aria-label="CSV file"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                upload.reset();
              }}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button
              disabled={!file || upload.isPending}
              onClick={() => file && upload.mutate(file)}
            >
              <FileUp className="size-4" />
              {upload.isPending ? 'Importing…' : 'Import students'}
            </Button>
            {upload.error ? (
              <p role="alert" className="text-sm text-destructive">
                {toErrorMessage(upload.error, 'The import failed')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Review the report</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <p className="text-sm text-muted-foreground">
                No import has run yet. Successful rows appear in the students list
                straight away.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">Total {result.total}</Badge>
                  <Badge>Imported {result.imported}</Badge>
                  <Badge variant={result.failed > 0 ? 'destructive' : 'secondary'}>
                    Failed {result.failed}
                  </Badge>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">Row</th>
                        <th className="px-3 py-1.5 font-medium">Admission</th>
                        <th className="px-3 py-1.5 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row) => (
                        <tr key={`${row.row}-${row.admissionNumber ?? 'row'}`} className="border-t">
                          <td className="px-3 py-1.5">{row.row}</td>
                          <td className="px-3 py-1.5">{row.admissionNumber ?? '—'}</td>
                          <td className="px-3 py-1.5">
                            {row.success ? (
                              <span className="text-emerald-700 dark:text-emerald-400">Imported</span>
                            ) : (
                              <span className="text-destructive">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link href="/admin/students" className={buttonVariants({ variant: 'outline' })}>
                  View students
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
