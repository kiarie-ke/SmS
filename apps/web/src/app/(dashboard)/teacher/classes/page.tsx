'use client';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { useListState } from '@/components/data-table/use-list-state';
import { classesControllerList } from '@/lib/api/generated/endpoints';
import type { ClassDto } from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { getPaginationMeta } from '@/lib/api/http-client';
import { useApiQuery } from '@/lib/api/use-api-query';

export default function TeacherClassesPage() {
  const list = useListState(10);

  const query = useApiQuery(
    ['classes', 'mine', list.page, list.limit, list.debouncedSearch],
    () =>
      classesControllerList({
        page: list.page,
        limit: list.limit,
        search: list.debouncedSearch || undefined,
      }),
  );

  const columns: Column<ClassDto>[] = [
    { key: 'name', header: 'Class', render: (klass) => <span className="font-medium">{klass.name}</span> },
    { key: 'level', header: 'Level', render: (klass) => klass.level },
    { key: 'year', header: 'Academic year', render: (klass) => klass.academicYearName },
    { key: 'teacher', header: 'Class teacher', render: (klass) => klass.classTeacherName ?? '—' },
    { key: 'students', header: 'Students', render: (klass) => klass.studentCount },
    { key: 'subjects', header: 'Subjects', render: (klass) => klass.subjectCount },
  ];

  const meta = getPaginationMeta(query.data);

  return (
    <div>
      <PageHeader
        title="My classes"
        description="Classes where you are the class teacher or teach a subject."
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
        searchPlaceholder="Search your classes"
        isLoading={query.isLoading}
        error={query.error ? toErrorMessage(query.error, 'Could not load your classes') : null}
        emptyMessage="You are not assigned to any class yet."
      />
    </div>
  );
}
