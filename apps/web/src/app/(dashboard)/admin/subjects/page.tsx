'use client';

import { subjectFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  subjectsControllerCreate,
  subjectsControllerList,
  subjectsControllerRemove,
  subjectsControllerUpdate,
} from '@/lib/api/generated/endpoints';
import type {
  CreateSubjectDto,
  SubjectDto,
  UpdateSubjectDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { getPaginationMeta } from '@/lib/api/http-client';
import { useApiQuery } from '@/lib/api/use-api-query';

const LEVEL_OPTIONS = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'JSS', label: 'JSS' },
  { value: 'SECONDARY', label: 'Secondary' },
];

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectDto | null>(null);

  const query = useApiQuery(
    ['subjects', list.page, list.limit, list.debouncedSearch],
    () =>
      subjectsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subjects'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      subjectsControllerCreate({
        name: String(values.name ?? '').trim(),
        code: String(values.code ?? '').trim().toUpperCase(),
        level: values.level,
        isCbc: Boolean(values.isCbc),
      } as unknown as CreateSubjectDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      subjectsControllerUpdate(input.id, {
        name: String(input.values.name ?? '').trim(),
        code: String(input.values.code ?? '').trim().toUpperCase(),
        level: input.values.level,
        isCbc: Boolean(input.values.isCbc),
      } as unknown as UpdateSubjectDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => subjectsControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<SubjectDto>[] = [
    { key: 'name', header: 'Subject', render: (subject) => <span className="font-medium">{subject.name}</span> },
    { key: 'code', header: 'Code', render: (subject) => subject.code },
    { key: 'level', header: 'Level', render: (subject) => subject.level },
    {
      key: 'cbc',
      header: 'CBC',
      render: (subject) =>
        subject.isCbc ? <Badge variant="secondary">CBC</Badge> : '—',
    },
    { key: 'classes', header: 'Class subjects', render: (subject) => subject.classSubjectCount },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Learning areas offered by the school."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add subject
          </Button>
        }
      />

      <DataTable
        rows={query.data?.data ?? []}
        columns={columns}
        total={meta?.total ?? 0}
        page={list.page}
        limit={list.limit}
        onPageChange={list.setPage}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search subject name or code"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load subjects') : null}
        emptyMessage="No subjects match this search."
        actions={(subject) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${subject.name}`}
              onClick={() => {
                setEditing(subject);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${subject.name}`}
              onClick={() => {
                if (window.confirm(`Delete ${subject.name}?`)) remove.mutate(subject.id);
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
        title={editing ? 'Edit subject' : 'Add subject'}
        fields={[
          { name: 'name', label: 'Subject name', type: 'text' },
          { name: 'code', label: 'Code', type: 'text', placeholder: 'MAT' },
          { name: 'level', label: 'Level', type: 'select', options: LEVEL_OPTIONS },
          { name: 'isCbc', label: 'CBC subject', type: 'checkbox' },
        ]}
        schema={subjectFormSchema}
        defaultValues={
          editing
            ? {
                name: editing.name,
                code: editing.code,
                level: editing.level,
                isCbc: editing.isCbc,
              }
            : { name: '', code: '', level: 'JSS', isCbc: true }
        }
        submitLabel={editing ? 'Save changes' : 'Create subject'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </div>
  );
}
