'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  GRADE_SCALE_TYPES,
  SCHOOL_CATEGORIES,
  SCHOOL_LEVELS,
  SCHOOL_TYPES,
  schoolSettingsFormSchema,
  type SchoolSettingsFormInput,
} from '@school-system/shared';
import {
  academicYearsControllerList,
  schoolSettingsControllerGet,
  schoolSettingsControllerSetAcademicPeriod,
  schoolSettingsControllerUpdate,
  termsControllerList,
} from '@/lib/api/generated/endpoints';
import type { SchoolSettingsDto, UpdateSchoolSettingsDto } from '@/lib/api/generated/models';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function settingsValues(settings: SchoolSettingsDto): SchoolSettingsFormInput {
  return {
    name: settings.name,
    motto: settings.motto ?? '',
    county: settings.county,
    subCounty: settings.subCounty,
    type: settings.type,
    category: settings.category,
    levels: settings.levels,
    gradeScaleType: settings.gradeScaleType,
    phone: settings.phone,
    email: settings.email,
    address: settings.address ?? '',
    principalName: settings.principalName,
    nemisCode: settings.nemisCode ?? '',
    knecCenterNumber: settings.knecCenterNumber ?? '',
  };
}

function useSettings() {
  return useApiQuery(['school-settings'], () => schoolSettingsControllerGet());
}

function SchoolDetailsForm() {
  const queryClient = useQueryClient();
  const query = useSettings();
  const settings = query.data?.data;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const form = useForm<SchoolSettingsFormInput>({
    resolver: zodResolver(schoolSettingsFormSchema),
    defaultValues: {
      name: '',
      motto: '',
      county: '',
      subCounty: '',
      type: 'PUBLIC',
      category: 'DAY',
      levels: ['PRIMARY'],
      gradeScaleType: 'CBC_8_4_4',
      phone: '',
      email: '',
      address: '',
      principalName: '',
      nemisCode: '',
      knecCenterNumber: '',
    },
  });

  useEffect(() => {
    if (settings) form.reset(settingsValues(settings));
  }, [form, settings]);

  const save = useMutation({
    mutationFn: (values: SchoolSettingsFormInput) =>
      schoolSettingsControllerUpdate({
        ...values,
        motto: values.motto || null,
        address: values.address || null,
        nemisCode: values.nemisCode || null,
        knecCenterNumber: values.knecCenterNumber || null,
      } satisfies UpdateSchoolSettingsDto),
    onSuccess: async () => {
      setSaveError(null);
      setSaveMessage('School settings saved.');
      await queryClient.invalidateQueries({ queryKey: ['school-settings'] });
    },
    onError: (error) => {
      setSaveMessage(null);
      setSaveError(toErrorMessage(error, 'Could not save school settings'));
    },
  });

  const errors = form.formState.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>School details</CardTitle>
        <CardDescription>Identity, contact details, school levels and grading mode.</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">Loading school settings…</p>
        ) : query.error ? (
          <p role="alert" className="text-sm text-destructive">
            {toErrorMessage(query.error, 'Could not load school settings')}
          </p>
        ) : settings ? (
          <form onSubmit={form.handleSubmit((values) => save.mutateAsync(values))} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-name">School name</Label>
                <Input id="school-name" {...form.register('name')} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-motto">Motto</Label>
                <Input id="school-motto" {...form.register('motto')} />
                <FieldError message={errors.motto?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-county">County</Label>
                <Input id="school-county" {...form.register('county')} />
                <FieldError message={errors.county?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-subcounty">Sub-county</Label>
                <Input id="school-subcounty" {...form.register('subCounty')} />
                <FieldError message={errors.subCounty?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-type">Ownership</Label>
                <select id="school-type" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('type')}>
                  {SCHOOL_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-category">School category</Label>
                <select id="school-category" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('category')}>
                  {SCHOOL_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone (Kenyan E.164)</Label>
                <Input id="school-phone" type="tel" {...form.register('phone')} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input id="school-email" type="email" {...form.register('email')} />
                <FieldError message={errors.email?.message} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="school-address">Address</Label>
                <Input id="school-address" {...form.register('address')} />
                <FieldError message={errors.address?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal-name">Principal</Label>
                <Input id="principal-name" {...form.register('principalName')} />
                <FieldError message={errors.principalName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-scale">Grading scheme</Label>
                <select id="grade-scale" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('gradeScaleType')}>
                  {GRADE_SCALE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value === 'CBC' ? 'CBC performance levels' : '8-4-4 numeric grades'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nemis-code">NEMIS code</Label>
                <Input id="nemis-code" {...form.register('nemisCode')} />
                <FieldError message={errors.nemisCode?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knec-center">KNEC centre number</Label>
                <Input id="knec-center" {...form.register('knecCenterNumber')} />
                <FieldError message={errors.knecCenterNumber?.message} />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">School levels</legend>
              <div className="flex flex-wrap gap-4">
                {SCHOOL_LEVELS.map((level) => (
                  <label key={level} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={level} {...form.register('levels')} />
                    {level}
                  </label>
                ))}
              </div>
              <FieldError message={errors.levels?.message} />
            </fieldset>

            {saveError ? <p role="alert" className="text-sm text-destructive">{saveError}</p> : null}
            {saveMessage && !form.formState.isDirty ? (
              <p role="status" className="text-sm text-emerald-700">{saveMessage}</p>
            ) : null}
            <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
              {save.isPending ? 'Saving…' : 'Save school details'}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AcademicPeriodSettings() {
  const queryClient = useQueryClient();
  const [yearId, setYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const yearsQuery = useApiQuery(
    ['settings-academic-years'],
    () => academicYearsControllerList({ limit: 100, sortBy: 'startDate', sortOrder: 'desc' }),
  );
  const years = yearsQuery.data?.data ?? [];

  useEffect(() => {
    if (years.length > 0 && !years.some((year) => year.id === yearId)) {
      setYearId(years.find((year) => year.isCurrent)?.id ?? years[0].id);
    }
  }, [yearId, years]);

  const termsQuery = useApiQuery(
    ['settings-terms', yearId],
    () => termsControllerList({ academicYearId: yearId, limit: 100, sortBy: 'startDate', sortOrder: 'asc' }),
    { enabled: Boolean(yearId) },
  );
  const terms = termsQuery.data?.data ?? [];

  useEffect(() => {
    if (!terms.some((term) => term.id === termId)) {
      setTermId(terms.find((term) => term.isCurrent)?.id ?? terms[0]?.id ?? '');
    }
  }, [termId, terms]);

  const setAcademicPeriod = useMutation({
    mutationFn: () => schoolSettingsControllerSetAcademicPeriod({ academicYearId: yearId, termId }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['settings-academic-years'] });
      await queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      await queryClient.invalidateQueries({ queryKey: ['settings-terms'] });
      await queryClient.invalidateQueries({ queryKey: ['terms'] });
      await queryClient.invalidateQueries({ queryKey: ['report-terms'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-report-summary'] });
    },
    onError: (error) =>
      setActionError(toErrorMessage(error, 'Could not update the current academic period')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic period</CardTitle>
        <CardDescription>Choose which year and term are active throughout the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {yearsQuery.isLoading ? (
          <p role="status" className="text-sm text-muted-foreground">Loading academic years…</p>
        ) : yearsQuery.error ? (
          <p role="alert" className="text-sm text-destructive">
            {toErrorMessage(yearsQuery.error, 'Could not load academic years')}
          </p>
        ) : years.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create an academic year before setting the current period.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-year">Academic year</Label>
                <select id="current-year" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={yearId} onChange={(event) => setYearId(event.target.value)}>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}{year.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="current-term">Term for selected year</Label>
                <select id="current-term" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={termId} onChange={(event) => setTermId(event.target.value)} disabled={terms.length === 0}>
                  {terms.length === 0 ? <option value="">No terms in this year</option> : null}
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name}{term.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={
                !yearId ||
                !termId ||
                (years.find((year) => year.id === yearId)?.isCurrent &&
                  terms.find((term) => term.id === termId)?.isCurrent) ||
                setAcademicPeriod.isPending
              }
              onClick={() => setAcademicPeriod.mutate()}
            >
              {setAcademicPeriod.isPending ? 'Updating…' : 'Set current academic period'}
            </Button>
            {termsQuery.error ? (
              <p role="alert" className="text-sm text-destructive">
                {toErrorMessage(termsQuery.error, 'Could not load terms')}
              </p>
            ) : null}
            {actionError ? <p role="alert" className="text-sm text-destructive">{actionError}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="School settings" description="Manage school identity, grading and the active academic period." />
      <SchoolDetailsForm />
      <AcademicPeriodSettings />
    </div>
  );
}
