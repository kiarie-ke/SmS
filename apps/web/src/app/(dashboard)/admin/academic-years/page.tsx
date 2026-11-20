'use client';

import { academicYearFormSchema, termFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog, type FieldOption } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  academicYearsControllerCreate,
  academicYearsControllerList,
  academicYearsControllerRemove,
  academicYearsControllerUpdate,
  termsControllerCreate,
  termsControllerList,
  termsControllerRemove,
  termsControllerUpdate,
} from '@/lib/api/generated/endpoints';
import type {
  AcademicYearDto,
  CreateAcademicYearDto,
  CreateTermDto,
  TermDto,
  UpdateAcademicYearDto,
  UpdateTermDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

async function yearOptions(): Promise<FieldOption[]> {
  const response = await academicYearsControllerList({ limit: 100, sortBy: 'startDate', sortOrder: 'desc' });
  return response.data.data.map((year) => ({ value: year.id, label: year.name }));
}

function YearsSection() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYearDto | null>(null);

  const query = useApiQuery(
    ['academic-years', list.page, list.limit, list.debouncedSearch],
    () =>
      academicYearsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'startDate',
        sortOrder: 'desc',
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academic-years'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      academicYearsControllerCreate({
        name: String(values.name ?? '').trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        isCurrent: Boolean(values.isCurrent),
      } as unknown as CreateAcademicYearDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      academicYearsControllerUpdate(input.id, {
        name: String(input.values.name ?? '').trim(),
        startDate: input.values.startDate,
        endDate: input.values.endDate,
        isCurrent: Boolean(input.values.isCurrent),
      } as unknown as UpdateAcademicYearDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => academicYearsControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<AcademicYearDto>[] = [
    {
      key: 'name',
      header: 'Year',
      render: (year) => (
        <span className="flex items-center gap-2 font-medium">
          {year.name}
          {year.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </span>
      ),
    },
    { key: 'start', header: 'Starts', render: (year) => year.startDate },
    { key: 'end', header: 'Ends', render: (year) => year.endDate },
    { key: 'terms', header: 'Terms', render: (year) => year.termCount },
    { key: 'classes', header: 'Classes', render: (year) => year.classCount },
  ];

  const meta = query.data?.data.meta;

  return (
    <>
      <DataTable
        rows={query.data?.data.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search academic year"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load academic years') : null}
        emptyMessage="No academic years yet."
        toolbar={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add academic year
          </Button>
        }
        actions={(year) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${year.name}`}
              onClick={() => {
                setEditing(year);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${year.name}`}
              onClick={() => {
                if (window.confirm(`Delete ${year.name}?`)) remove.mutate(year.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      />

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit academic year' : 'Add academic year'}
        fields={[
          { name: 'name', label: 'Name', type: 'text', placeholder: '2027' },
          { name: 'startDate', label: 'Start date', type: 'date' },
          { name: 'endDate', label: 'End date', type: 'date' },
          { name: 'isCurrent', label: 'Current academic year', type: 'checkbox' },
        ]}
        schema={academicYearFormSchema}
        defaultValues={
          editing
            ? {
                name: editing.name,
                startDate: editing.startDate,
                endDate: editing.endDate,
                isCurrent: editing.isCurrent,
              }
            : { name: '', startDate: '', endDate: '', isCurrent: false }
        }
        submitLabel={editing ? 'Save changes' : 'Create year'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </>
  );
}

function TermsSection() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TermDto | null>(null);

  const query = useApiQuery(
    ['terms', list.page, list.limit, list.debouncedSearch],
    () =>
      termsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'startDate',
        sortOrder: 'desc',
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['terms'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      termsControllerCreate({
        academicYearId: values.academicYearId,
        termNumber: Number(values.termNumber),
        name: String(values.name ?? '').trim(),
        startDate: values.startDate,
        endDate: values.endDate,
        isCurrent: Boolean(values.isCurrent),
      } as unknown as CreateTermDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      termsControllerUpdate(input.id, {
        academicYearId: input.values.academicYearId,
        termNumber: Number(input.values.termNumber),
        name: String(input.values.name ?? '').trim(),
        startDate: input.values.startDate,
        endDate: input.values.endDate,
        isCurrent: Boolean(input.values.isCurrent),
      } as unknown as UpdateTermDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => termsControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<TermDto>[] = [
    {
      key: 'name',
      header: 'Term',
      render: (term) => (
        <span className="flex items-center gap-2 font-medium">
          {term.name}
          {term.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </span>
      ),
    },
    { key: 'year', header: 'Academic year', render: (term) => term.academicYearName },
    { key: 'start', header: 'Starts', render: (term) => term.startDate },
    { key: 'end', header: 'Ends', render: (term) => term.endDate },
  ];

  const meta = query.data?.data.meta;

  return (
    <>
      <DataTable
        rows={query.data?.data.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search term"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load terms') : null}
        emptyMessage="No terms yet."
        toolbar={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add term
          </Button>
        }
        actions={(term) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${term.name}`}
              onClick={() => {
                setEditing(term);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${term.name}`}
              onClick={() => {
                if (window.confirm(`Delete ${term.name}?`)) remove.mutate(term.id);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      />

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit term' : 'Add term'}
        fields={[
          { name: 'academicYearId', label: 'Academic year', type: 'select', options: yearOptions },
          { name: 'termNumber', label: 'Term number', type: 'number' },
          { name: 'name', label: 'Name', type: 'text', placeholder: 'Term 1' },
          { name: 'startDate', label: 'Start date', type: 'date' },
          { name: 'endDate', label: 'End date', type: 'date' },
          { name: 'isCurrent', label: 'Current term', type: 'checkbox' },
        ]}
        schema={termFormSchema}
        defaultValues={
          editing
            ? {
                academicYearId: editing.academicYearId,
                termNumber: editing.termNumber,
                name: editing.name,
                startDate: editing.startDate,
                endDate: editing.endDate,
                isCurrent: editing.isCurrent,
              }
            : {
                academicYearId: '',
                termNumber: 1,
                name: 'Term 1',
                startDate: '',
                endDate: '',
                isCurrent: false,
              }
        }
        submitLabel={editing ? 'Save changes' : 'Create term'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </>
  );
}

export default function AcademicYearsPage() {
  return (
    <div>
      <PageHeader
        title="Academic years & terms"
        description="Only one academic year and one term can be current at a time."
      />
      <Tabs defaultValue="years">
        <TabsList variant="line">
          <TabsTrigger value="years">Years</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
        </TabsList>
        <TabsContent value="years" className="pt-4">
          <YearsSection />
        </TabsContent>
        <TabsContent value="terms" className="pt-4">
          <TermsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
