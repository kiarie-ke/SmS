'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImagePlus, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  guardiansControllerList,
  studentsControllerGet,
  studentsControllerLinkGuardian,
  studentsControllerUploadPhoto,
} from '@/lib/api/generated/endpoints';
import type { StudentDetailDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value && value.length > 0 ? value : '—'}</dd>
    </div>
  );
}

export function StudentDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const query = useApiQuery(['student', id], () => studentsControllerGet(id));
  const guardians = useApiQuery(['guardians', 'options'], () =>
    guardiansControllerList({ limit: 100, sortBy: 'lastName' }),
  );

  const [guardianId, setGuardianId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const linkGuardian = useMutation({
    mutationFn: () =>
      studentsControllerLinkGuardian(id, { guardianId, isPrimary }),
    onSuccess: async () => {
      setGuardianId('');
      setIsPrimary(false);
      await queryClient.invalidateQueries({ queryKey: ['student', id] });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => studentsControllerUploadPhoto(id, { file }),
    onSuccess: async () => {
      setPhoto(null);
      setPreview(null);
      if (photoInput.current) photoInput.current.value = '';
      await queryClient.invalidateQueries({ queryKey: ['student', id] });
      await queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-destructive">
          {toErrorMessage(query.error, 'Could not load this student')}
        </p>
        <Link href="/admin/students" className="text-sm underline">
          Back to students
        </Link>
      </div>
    );
  }

  const student: StudentDetailDto = query.data.data;
  const photoUrl = preview ?? student.photoUrl;

  return (
    <div>
      <Link
        href="/admin/students"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to students
      </Link>

      <PageHeader
        title={student.fullName}
        description={`${student.admissionNumber} · ${student.className}${student.streamName ? ` · ${student.streamName}` : ''} · UPI ${student.upi}`}
        actions={
          <Badge variant="outline">
            {student.gender} · {student.boardingStatus}
          </Badge>
        }
      />

      <Tabs defaultValue="profile">
        <TabsList variant="line">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="photo">Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student record</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Admission number" value={student.admissionNumber} />
                <Detail label="NEMIS UPI" value={student.upi} />
                <Detail label="Date of birth" value={student.dateOfBirth} />
                <Detail label="Class" value={student.className} />
                <Detail label="Stream" value={student.streamName} />
                <Detail label="County" value={student.county} />
                <Detail label="Sub-county" value={student.subCounty} />
                <Detail label="Religion" value={student.religion} />
                <Detail label="Birth certificate" value={student.birthCertificateNumber} />
                <Detail label="KNEC index" value={student.knecIndexNumber} />
                <Detail
                  label="Special needs"
                  value={student.specialNeeds ? 'Yes' : 'No'}
                />
                <Detail label="Linked login" value={student.userId} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked guardians</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.guardians.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No guardian is linked to this student yet.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {student.guardians.map((guardian) => (
                    <li
                      key={guardian.guardianId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {guardian.firstName} {guardian.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {guardian.relationship} · {guardian.phone}
                        </p>
                      </div>
                      {guardian.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (guardianId) linkGuardian.mutate();
                }}
              >
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="guardian">Link an existing guardian</Label>
                  <select
                    id="guardian"
                    value={guardianId}
                    onChange={(event) => setGuardianId(event.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="">Select guardian…</option>
                    {(guardians.data?.data ?? []).map((guardian) => (
                      <option key={guardian.id} value={guardian.id}>
                        {guardian.fullName} · {guardian.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex h-8 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={isPrimary}
                    onChange={(event) => setIsPrimary(event.target.checked)}
                  />
                  Primary
                </label>
                <Button type="submit" disabled={!guardianId || linkGuardian.isPending}>
                  <Link2 className="size-4" />
                  {linkGuardian.isPending ? 'Linking…' : 'Link guardian'}
                </Button>
              </form>

              {linkGuardian.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {toErrorMessage(linkGuardian.error, 'Could not link the guardian')}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photo" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={`${student.fullName} photo`}
                    className="size-24 rounded-xl object-cover ring-1 ring-foreground/10"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Student photo"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setPhoto(selected);
                      setPreview(selected ? URL.createObjectURL(selected) : null);
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG or WebP up to 2 MB. EXIF metadata is stripped on the
                    server before upload.
                  </p>
                  <Button
                    disabled={!photo || upload.isPending}
                    onClick={() => photo && upload.mutate(photo)}
                  >
                    <ImagePlus className="size-4" />
                    {upload.isPending ? 'Uploading…' : 'Upload photo'}
                  </Button>
                </div>
              </div>

              {upload.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {toErrorMessage(upload.error, 'Could not upload the photo')}
                </p>
              ) : null}
              {upload.isSuccess ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Photo updated.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
