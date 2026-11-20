'use client';

import { classFormSchema, streamFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog, type FieldOption } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  academicYearsControllerList,
  classesControllerCreate,
  classesControllerList,
  classesControllerRemove,
  classesControllerUpdate,
  streamsControllerCreate,
  streamsControllerList,
  streamsControllerRemove,
  streamsControllerUpdate,
  teachersControllerList,
} from '@/lib/api/generated/endpoints';
import type {
  ClassDto,
  CreateClassDto,
  CreateStreamDto,
  StreamDto,
  UpdateClassDto,
  UpdateStreamDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { getPaginationMeta } from '@/lib/api/http-client';
import { useApiQuery } from '@/lib/api/use-api-query';

const LEVEL_OPTIONS = [
  'PP1',
  'PP2',
  'G1',
  'G2',
  'G3',
  'G4',
  'G5',
  'G6',
  'G7',
  'G8',
  'G9',
  'G10',
  'G11',
  'G12',
  'STD1',
  'STD2',
  'STD3',
  'STD4',
  'STD5',
  'STD6',
  'STD7',
  'STD8',
  'FORM1',
  'FORM2',
  'FORM3',
  'FORM4',
].map((level) => ({ value: level, label: level }));

async function yearOptions(): Promise<FieldOption[]> {
  const response = await academicYearsControllerList({ limit: 100, sortBy: 'startDate', sortOrder: 'desc' });
  return response.data.map((year) => ({
    value: year.id,
    label: `${year.name}${year.isCurrent ? ' (current)' : ''}`,
  }));
}

async function teacherOptions(): Promise<FieldOption[]> {
  const response = await teachersControllerList({ limit: 100 });
  return response.data.map((teacher) => ({
    value: teacher.id,
    label: `${teacher.fullName} · ${teacher.tscNumber}`,
  }));
}

async function classOptions(): Promise<FieldOption[]> {
  const response = await classesControllerList({ limit: 100 });
  return response.data.map((klass) => ({ value: klass.id, label: klass.name }));
}

function ClassesSection() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassDto | null>(null);

  const query = useApiQuery(
    ['classes', list.page, list.limit, list.debouncedSearch],
    () =>
      classesControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['classes'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      classesControllerCreate({
        level: values.level,
        name: String(values.name ?? '').trim(),
        academicYearId: values.academicYearId,
        classTeacherId: values.classTeacherId || null,
      } as unknown as CreateClassDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      classesControllerUpdate(input.id, {
        level: input.values.level,
        name: String(input.values.name ?? '').trim(),
        academicYearId: input.values.academicYearId,
        classTeacherId: input.values.classTeacherId || null,
      } as unknown as UpdateClassDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => classesControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<ClassDto>[] = [
    { key: 'name', header: 'Class', render: (klass) => <span className="font-medium">{klass.name}</span> },
    { key: 'level', header: 'Level', render: (klass) => klass.level },
    { key: 'year', header: 'Academic year', render: (klass) => klass.academicYearName },
    { key: 'teacher', header: 'Class teacher', render: (klass) => klass.classTeacherName ?? '—' },
    { key: 'students', header: 'Students', render: (klass) => klass.studentCount },
    { key: 'streams', header: 'Streams', render: (klass) => klass.streamCount },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <>
      <DataTable
        rows={query.data?.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search class or class teacher"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load classes') : null}
        emptyMessage="No classes match this search."
        toolbar={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add class
          </Button>
        }
        actions={(klass) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${klass.name}`}
              onClick={() => {
                setEditing(klass);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${klass.name}`}
              onClick={() => {
                if (window.confirm(`Delete ${klass.name}?`)) remove.mutate(klass.id);
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
        title={editing ? 'Edit class' : 'Add class'}
        fields={[
          { name: 'name', label: 'Class name', type: 'text' },
          { name: 'level', label: 'Level', type: 'select', options: LEVEL_OPTIONS },
          { name: 'academicYearId', label: 'Academic year', type: 'select', options: yearOptions },
          {
            name: 'classTeacherId',
            label: 'Class teacher (optional)',
            type: 'select',
            options: teacherOptions,
            emptyOptionLabel: 'No class teacher',
          },
        ]}
        schema={classFormSchema}
        defaultValues={
          editing
            ? {
                name: editing.name,
                level: editing.level,
                academicYearId: editing.academicYearId,
                classTeacherId: editing.classTeacherId ?? '',
              }
            : { name: '', level: 'G7', academicYearId: '', classTeacherId: '' }
        }
        submitLabel={editing ? 'Save changes' : 'Create class'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </>
  );
}

function StreamsSection() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StreamDto | null>(null);

  const query = useApiQuery(
    ['streams', list.page, list.limit, list.debouncedSearch],
    () =>
      streamsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['streams'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      streamsControllerCreate({
        classId: values.classId,
        name: String(values.name ?? '').trim(),
      } as unknown as CreateStreamDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      streamsControllerUpdate(input.id, {
        classId: input.values.classId,
        name: String(input.values.name ?? '').trim(),
      } as unknown as UpdateStreamDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => streamsControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<StreamDto>[] = [
    { key: 'name', header: 'Stream', render: (stream) => <span className="font-medium">{stream.name}</span> },
    { key: 'class', header: 'Class', render: (stream) => stream.className },
    { key: 'level', header: 'Level', render: (stream) => stream.classLevel },
    { key: 'students', header: 'Students', render: (stream) => stream.studentCount },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <>
      <DataTable
        rows={query.data?.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search stream"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load streams') : null}
        emptyMessage="No streams yet."
        toolbar={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add stream
          </Button>
        }
        actions={(stream) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${stream.name}`}
              onClick={() => {
                setEditing(stream);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${stream.name}`}
              onClick={() => {
                if (window.confirm(`Delete ${stream.name}?`)) remove.mutate(stream.id);
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
        title={editing ? 'Edit stream' : 'Add stream'}
        fields={[
          { name: 'classId', label: 'Class', type: 'select', options: classOptions },
          { name: 'name', label: 'Stream name', type: 'text' },
        ]}
        schema={streamFormSchema}
        defaultValues={
          editing
            ? { classId: editing.classId, name: editing.name }
            : { classId: '', name: 'Main' }
        }
        submitLabel={editing ? 'Save changes' : 'Create stream'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </>
  );
}

export default function ClassesPage() {
  return (
    <div>
      <PageHeader
        title="Classes & streams"
        description="Each class belongs to an academic year and may have several streams."
      />
      <Tabs defaultValue="classes">
        <TabsList variant="line">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="streams">Streams</TabsTrigger>
        </TabsList>
        <TabsContent value="classes" className="pt-4">
          <ClassesSection />
        </TabsContent>
        <TabsContent value="streams" className="pt-4">
          <StreamsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
