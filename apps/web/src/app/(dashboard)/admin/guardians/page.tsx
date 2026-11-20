'use client';

import { guardianFormSchema } from '@school-system/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { EntityDialog } from '@/components/data-table/entity-dialog';
import { useListState } from '@/components/data-table/use-list-state';
import { Button } from '@/components/ui/button';
import {
  guardiansControllerCreate,
  guardiansControllerList,
  guardiansControllerRemove,
  guardiansControllerUpdate,
} from '@/lib/api/generated/endpoints';
import type {
  CreateGuardianDto,
  GuardianDto,
  UpdateGuardianDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { getPaginationMeta } from '@/lib/api/http-client';
import { useApiQuery } from '@/lib/api/use-api-query';

const RELATIONSHIP_OPTIONS = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'AUNT', label: 'Aunt' },
  { value: 'UNCLE', label: 'Uncle' },
  { value: 'GRANDPARENT', label: 'Grandparent' },
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'OTHER', label: 'Other' },
];

const EMPTY_GUARDIAN = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  nationalId: '',
  relationship: 'MOTHER',
  occupation: '',
  address: '',
};

function toPayload(values: Record<string, unknown>) {
  const text = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string).trim() : '';
  return {
    firstName: text('firstName'),
    lastName: text('lastName'),
    phone: text('phone'),
    email: text('email') || undefined,
    nationalId: text('nationalId') || undefined,
    relationship: values.relationship,
    occupation: text('occupation') || undefined,
    address: text('address') || undefined,
  };
}

export default function GuardiansPage() {
  const queryClient = useQueryClient();
  const list = useListState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GuardianDto | null>(null);

  const query = useApiQuery(
    ['guardians', list.page, list.limit, list.debouncedSearch],
    () =>
      guardiansControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'lastName',
        sortOrder: 'asc',
      }),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['guardians'] });

  const create = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      guardiansControllerCreate(toPayload(values) as unknown as CreateGuardianDto),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const update = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      guardiansControllerUpdate(
        input.id,
        toPayload(input.values) as unknown as UpdateGuardianDto,
      ),
    onSuccess: async () => {
      await invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => guardiansControllerRemove(id),
    onSuccess: invalidate,
  });

  const columns: Column<GuardianDto>[] = [
    {
      key: 'name',
      header: 'Guardian',
      render: (guardian) => (
        <span className="font-medium">{guardian.fullName}</span>
      ),
    },
    { key: 'phone', header: 'Phone', render: (guardian) => guardian.phone },
    { key: 'relationship', header: 'Relationship', render: (guardian) => guardian.relationship },
    {
      key: 'email',
      header: 'Email',
      render: (guardian) => guardian.email ?? '—',
    },
    {
      key: 'students',
      header: 'Students',
      render: (guardian) => guardian.studentCount,
    },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <div>
      <PageHeader
        title="Guardians"
        description="Parents and sponsors. Link them to students from a student's page."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add guardian
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
        searchPlaceholder="Search name, phone or email"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load guardians') : null}
        emptyMessage="No guardians match this search."
        actions={(guardian) => (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${guardian.fullName}`}
              onClick={() => {
                setEditing(guardian);
                setOpen(true);
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${guardian.fullName}`}
              onClick={() => {
                if (window.confirm(`Delete ${guardian.fullName} and their student links?`)) {
                  remove.mutate(guardian.id);
                }
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
        title={editing ? 'Edit guardian' : 'Add guardian'}
        fields={[
          { name: 'firstName', label: 'First name', type: 'text' },
          { name: 'lastName', label: 'Last name', type: 'text' },
          { name: 'phone', label: 'Phone', type: 'text', placeholder: '+254712345678' },
          { name: 'email', label: 'Email (optional)', type: 'email' },
          {
            name: 'relationship',
            label: 'Relationship',
            type: 'select',
            options: RELATIONSHIP_OPTIONS,
          },
          { name: 'nationalId', label: 'National ID (optional)', type: 'text' },
          { name: 'occupation', label: 'Occupation (optional)', type: 'text' },
          { name: 'address', label: 'Address (optional)', type: 'textarea' },
        ]}
        schema={guardianFormSchema}
        defaultValues={
          editing
            ? {
                firstName: editing.firstName,
                lastName: editing.lastName,
                phone: editing.phone,
                email: editing.email ?? '',
                nationalId: editing.nationalId ?? '',
                relationship: editing.relationship,
                occupation: editing.occupation ?? '',
                address: editing.address ?? '',
              }
            : EMPTY_GUARDIAN
        }
        submitLabel={editing ? 'Save changes' : 'Create guardian'}
        onSubmit={async (values) => {
          if (editing) await update.mutateAsync({ id: editing.id, values });
          else await create.mutateAsync(values);
        }}
      />
    </div>
  );
}
