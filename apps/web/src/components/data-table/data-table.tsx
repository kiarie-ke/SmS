'use client';

import { Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  actions?: (row: T) => ReactNode;
  toolbar?: ReactNode;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  total,
  page,
  limit,
  onPageChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  isLoading = false,
  error,
  emptyMessage = 'Nothing to show yet.',
  actions,
  toolbar,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="pl-8"
          />
        </div>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {actions ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {Array.from({ length: columnCount }).map((_, cellIndex) => (
                    <TableCell key={`skeleton-${rowIndex}-${cellIndex}`}>
                      <Skeleton className="h-5 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-8 text-center">
                  <span role="alert" className="text-sm text-destructive">
                    {error}
                  </span>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                  {actions ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">{actions(row)}</div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
        <span>
          {total === 0 ? 'No records' : `Showing ${start}–${end} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
