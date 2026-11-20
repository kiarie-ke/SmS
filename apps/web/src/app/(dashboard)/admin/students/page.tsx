'use client';

import { studentFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog, type FieldOption } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  classesControllerList,
  streamsControllerList,
  studentsControllerCreate,
  studentsControllerList,
  studentsControllerRemove,
  studentsControllerUpdate,
} from '@/lib/api/generated/endpoints';
import type {
  CreateStudentDto,
  StudentDto,
  UpdateStudentDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const EMPTY_STUDENT = {
  admissionNumber: '',
  upi: '',
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  county: 'Nairobi',
  subCounty: '',
  classId: '',
  streamId: '',
  boardingStatus: 'DAY',
  religion: '',
};

async function classOptions(): Promise<FieldOption[]> {
  const response = await classesControllerList({ limit: 100 });
  return response.data.data.map((klass) => ({
    value: klass.id,
    label: `${klass.name} (${klass.academicYearName})`,
  }));
}

async function streamOptions(values: Record<string, unknown>): Promise<FieldOption[]> {
  if (!values.classId) return [];
  const response = await streamsControllerList({ classId: String(values.classId), limit: 100 });
  return response.data.data.map((stream) => ({ value: stream.id, label: stream.name }));
}

function toPayload(values: Record<string, unknown>) {
  const text = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string).trim() : '';
  return {
    admissionNumber: text('admissionNumber'),
    upi: text('upi'),
    firstName: text('firstName'),
    middleName: text('middleName') || undefined,
    lastName: text('lastName'),
    gender: values.gender,
    dateOfBirth: text('dateOfBirth'),
    county: text('county'),
    subCounty: text('subCounty'),
    classId: values.classId,
    streamId: values.streamId || undefined,
    boardingStatus: values.boardingStatus || undefined,
    religion: text('religion') || undefined,
  };
}

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentDto | null>(null);

  const query = useApiQuery(
    ['students', list.page, list.limit, list.debouncedSearch],
    () =>
      studentsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
  );

  const rows = query.data?.data.data ?? [];
  const meta = query.data?.data.meta;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['students'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      studentsControllerCreate(toPayload(values) as unknown as CreateStudentDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      studentsControllerUpdate(
        input.id,
        toPayload(input.values) as unknown as UpdateStudentDto,
      ),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => studentsControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<StudentDto>[] = [
    {
      key: 'admissionNumber',
      header: 'Admission',
      render: (student) => <span className="font-medium">{student.admissionNumber}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (student) => (
        <Link
          href={`/admin/students/${student.id}`}
          className="underline-offset-4 hover:underline"
        >
          {student.fullName}
        </Link>
      ),
    },
    { key: 'class', header: 'Class', render: (student) => student.className },
    {
      key: 'stream',
      header: 'Stream',
      render: (student) => student.streamName ?? '—',
    },
    { key: 'gender', header: 'Gender', render: (student) => student.gender },
    {
      key: 'guardians',
      header: 'Guardians',
      render: (student) => student.guardianCount,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        description="Enrolment for the school. Reads are scoped by role in the API."
        actions={
          <>
            <Link
              href="/admin/students/import"
              className={buttonVariants({ variant: 'outline' })}
            >
              <Upload className="size-4" /> Import CSV
            </Link>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Add student
            </Button>
          </>
        }
      />

      <DataTable
        rows={rows}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, admission number or UPI"
        isLoading={query.isLoading}
        error={
          query.error ? toErrorMessage(query.error, 'Could not load students') : null
        }
        emptyMessage="No students match this search."
        actions={(student) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${student.fullName}`}
              onClick={() => {
                setEditing(student);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Archive ${student.fullName}`}
              onClick={() => {
                if (window.confirm(`Archive ${student.fullName}?`)) archive.mutate(student.id);
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
        title={editing ? 'Edit student' : 'Add student'}
        description={
          editing
            ? `Updating ${editing.fullName}`
            : 'Create the student record. A guardian can be linked from the student page.'
        }
        fields={[
          { name: 'admissionNumber', label: 'Admission number', type: 'text' },
          { name: 'upi', label: 'NEMIS UPI', type: 'text' },
          { name: 'firstName', label: 'First name', type: 'text' },
          { name: 'middleName', label: 'Middle name', type: 'text' },
          { name: 'lastName', label: 'Last name', type: 'text' },
          {
            name: 'gender',
            label: 'Gender',
            type: 'select',
            options: [
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
            ],
          },
          { name: 'dateOfBirth', label: 'Date of birth', type: 'date' },
          {
            name: 'boardingStatus',
            label: 'Boarding',
            type: 'select',
            options: [
              { value: 'DAY', label: 'Day' },
              { value: 'BOARDER', label: 'Boarder' },
            ],
          },
          { name: 'county', label: 'County', type: 'text' },
          { name: 'subCounty', label: 'Sub-county', type: 'text' },
          { name: 'religion', label: 'Religion (optional)', type: 'text' },
          {
            name: 'classId',
            label: 'Class',
            type: 'select',
            options: classOptions,
          },
          {
            name: 'streamId',
            label: 'Stream (optional)',
            type: 'select',
            options: streamOptions,
            dependsOn: 'classId',
            emptyOptionLabel: 'No stream',
          },
        ]}
        schema={studentFormSchema}
        defaultValues={
          editing
            ? {
                admissionNumber: editing.admissionNumber,
                upi: editing.upi,
                firstName: editing.firstName,
                middleName: editing.middleName ?? '',
                lastName: editing.lastName,
                gender: editing.gender,
                dateOfBirth: editing.dateOfBirth,
                county: editing.county,
                subCounty: editing.subCounty,
                classId: editing.classId,
                streamId: editing.streamId ?? '',
                boardingStatus: editing.boardingStatus,
                religion: editing.religion ?? '',
              }
            : EMPTY_STUDENT
        }
        submitLabel={editing ? 'Save changes' : 'Create student'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </div>
  );
}
