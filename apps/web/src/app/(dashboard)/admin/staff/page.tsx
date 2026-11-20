'use client';

import { teacherFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookUser, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog, type FieldOption } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Button } from '@/components/ui/button';
import {
  classesControllerList,
  subjectsControllerList,
  teachersControllerAssignClassSubject,
  teachersControllerCreate,
  teachersControllerList,
  teachersControllerRemove,
  teachersControllerUpdate,
  usersControllerList,
} from '@/lib/api/generated/endpoints';
import type {
  CreateTeacherDto,
  TeacherDto,
  UpdateTeacherDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const assignmentSchema = z.object({
  classId: z.string().uuid('Choose a class'),
  subjectId: z.string().uuid('Choose a subject'),
});

const EMPTY_TEACHER = {
  userId: '',
  tscNumber: '',
  nationalId: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  employmentType: 'TSC',
};

async function teacherAccountOptions(): Promise<FieldOption[]> {
  const response = await usersControllerList({ role: 'TEACHER', limit: 100 });
  return response.data.data.map((user) => ({
    value: user.id,
    label: `${user.email} (${user.phone})`,
  }));
}

async function classOptions(): Promise<FieldOption[]> {
  const response = await classesControllerList({ limit: 100 });
  return response.data.data.map((klass) => ({ value: klass.id, label: klass.name }));
}

async function subjectOptions(): Promise<FieldOption[]> {
  const response = await subjectsControllerList({ limit: 100 });
  return response.data.data.map((subject) => ({
    value: subject.id,
    label: `${subject.name} (${subject.code})`,
  }));
}

function toPayload(values: Record<string, unknown>) {
  const text = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string).trim() : '';
  return {
    userId: values.userId,
    tscNumber: text('tscNumber'),
    nationalId: text('nationalId'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    phone: text('phone'),
    email: text('email'),
    employmentType: values.employmentType,
  };
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherDto | null>(null);
  const [assigning, setAssigning] = useState<TeacherDto | null>(null);

  const query = useApiQuery(
    ['teachers', list.page, list.limit, list.debouncedSearch],
    () =>
      teachersControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teachers'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      teachersControllerCreate(toPayload(values) as unknown as CreateTeacherDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      teachersControllerUpdate(
        input.id,
        toPayload(input.values) as unknown as UpdateTeacherDto,
      ),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => teachersControllerRemove(id),
    onSuccess: invalidate,
  });

  const assign = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      teachersControllerAssignClassSubject(input.id, {
        classId: String(input.values.classId),
        subjectId: String(input.values.subjectId),
      }),
    onSuccess: async () => {
      await invalidate();
      setAssigning(null);
    },
  });

  const columns: Column<TeacherDto>[] = [
    {
      key: 'name',
      header: 'Teacher',
      render: (teacher) => <span className="font-medium">{teacher.fullName}</span>,
    },
    { key: 'tsc', header: 'TSC number', render: (teacher) => teacher.tscNumber },
    { key: 'phone', header: 'Phone', render: (teacher) => teacher.phone },
    { key: 'email', header: 'Email', render: (teacher) => teacher.email },
    {
      key: 'employment',
      header: 'Employment',
      render: (teacher) => teacher.employmentType,
    },
    {
      key: 'assignments',
      header: 'Class subjects',
      render: (teacher) => teacher.assignmentCount,
    },
  ];

  const meta = query.data?.data.meta;

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Teachers, their TSC details and class-subject assignments."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add teacher
          </Button>
        }
      />

      <DataTable
        rows={query.data?.data.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search name, TSC number or email"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load teachers') : null}
        emptyMessage="No teachers match this search."
        actions={(teacher) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Assign ${teacher.fullName}`}
              onClick={() => setAssigning(teacher)}
            >
              <BookUser className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${teacher.fullName}`}
              onClick={() => {
                setEditing(teacher);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Archive ${teacher.fullName}`}
              onClick={() => {
                if (window.confirm(`Archive ${teacher.fullName}?`)) remove.mutate(teacher.id);
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
        title={editing ? 'Edit teacher' : 'Add teacher'}
        description="A teacher record must be linked to an existing TEACHER login account."
        fields={[
          {
            name: 'userId',
            label: 'Login account',
            type: 'select',
            options: teacherAccountOptions,
          },
          { name: 'firstName', label: 'First name', type: 'text' },
          { name: 'lastName', label: 'Last name', type: 'text' },
          { name: 'tscNumber', label: 'TSC number', type: 'text' },
          { name: 'nationalId', label: 'National ID', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text', placeholder: '+254712345678' },
          { name: 'email', label: 'Email', type: 'email' },
          {
            name: 'employmentType',
            label: 'Employment type',
            type: 'select',
            options: [
              { value: 'TSC', label: 'TSC' },
              { value: 'BOM', label: 'BOM' },
              { value: 'INTERN', label: 'Intern' },
            ],
          },
        ]}
        schema={teacherFormSchema}
        defaultValues={
          editing
            ? {
                userId: editing.userId,
                tscNumber: editing.tscNumber,
                nationalId: editing.nationalId,
                firstName: editing.firstName,
                lastName: editing.lastName,
                phone: editing.phone,
                email: editing.email,
                employmentType: editing.employmentType,
              }
            : EMPTY_TEACHER
        }
        submitLabel={editing ? 'Save changes' : 'Create teacher'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />

      <EntityDialog
        open={assigning !== null}
        onOpenChange={(next) => {
          if (!next) setAssigning(null);
        }}
        title="Assign class subject"
        description={
          assigning ? `Assign ${assigning.fullName} to a class and subject.` : undefined
        }
        fields={[
          { name: 'classId', label: 'Class', type: 'select', options: classOptions },
          { name: 'subjectId', label: 'Subject', type: 'select', options: subjectOptions },
        ]}
        schema={assignmentSchema}
        defaultValues={{ classId: '', subjectId: '' }}
        submitLabel="Assign"
        onSubmit={async (values) => {
          if (assigning) await assign.mutateAsync({ id: assigning.id, values });
        }}
      />
    </div>
  );
}
