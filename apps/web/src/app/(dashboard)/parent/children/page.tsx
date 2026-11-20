'use client';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { useListState } from '@/components/data-table/use-list-state';
import { studentsControllerList } from '@/lib/api/generated/endpoints';
import type { StudentDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { getPaginationMeta } from '@/lib/api/http-client';
import { useApiQuery } from '@/lib/api/use-api-query';

export default function ParentChildrenPage() {
  const list = useListState(10);

  const query = useApiQuery(
    ['students', 'children', list.page, list.limit, list.debouncedSearch],
    () =>
      studentsControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
        sortBy: 'firstName',
        sortOrder: 'asc',
      }),
  );

  const columns: Column<StudentDto>[] = [
    {
      key: 'name',
      header: 'Child',
      render: (student) => <span className="font-medium">{student.fullName}</span>,
    },
    { key: 'admission', header: 'Admission', render: (student) => student.admissionNumber },
    { key: 'class', header: 'Class', render: (student) => student.className },
    { key: 'stream', header: 'Stream', render: (student) => student.streamName ?? '—' },
    { key: 'gender', header: 'Gender', render: (student) => student.gender },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <div>
      <PageHeader
        title="My children"
        description="Only students linked to your guardian record are returned by the API."
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
        searchPlaceholder="Search your children"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load your children') : null}
        emptyMessage="No children are linked to your account yet. Contact the school office."
      />
    </div>
  );
}
