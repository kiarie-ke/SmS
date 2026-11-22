'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import {
  libraryControllerIssue,
  libraryControllerListBooks,
  libraryControllerListCopies,
  libraryControllerListLoans,
  libraryControllerListStudents,
  libraryControllerReturn,
} from '@/lib/api/generated/endpoints';
import type {
  BookLoanDto,
  BookCatalogueDto,
  BookCopyCatalogueDto,
  LibraryStudentDto,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

function dateLabel(value: string | null): string {
  if (!value) return 'Manual return';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function LibraryLoansPage({
  booksHref = '/librarian/books',
}: {
  booksHref?: string;
}) {
  const queryClient = useQueryClient();
  const [bookId, setBookId] = useState('');
  const [copyId, setCopyId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const booksQuery = useApiQuery(['library-books', 'issue'], () =>
    libraryControllerListBooks({ limit: 100 }),
  );
  const copiesQuery = useApiQuery(
    ['library-copies', bookId],
    () => libraryControllerListCopies(bookId, { status: 'AVAILABLE', limit: 100 }),
    { enabled: !!bookId },
  );
  const studentsQuery = useApiQuery(
    ['library-students', studentSearch],
    () => libraryControllerListStudents({ search: studentSearch || undefined, limit: 100 }),
  );
  const loansQuery = useApiQuery(['library-loans', 'ACTIVE'], () =>
    libraryControllerListLoans({ status: 'ACTIVE', limit: 100 }),
  );

  const books: BookCatalogueDto[] = booksQuery.data?.data ?? [];
  const copies: BookCopyCatalogueDto[] = copiesQuery.data?.data ?? [];
  const students: LibraryStudentDto[] = studentsQuery.data?.data ?? [];
  const loans: BookLoanDto[] = loansQuery.data?.data ?? [];
  const selectedBook = books.find((book) => book.id === bookId);

  const issue = useMutation({
    mutationFn: () => libraryControllerIssue({ copyId, studentId }),
    onSuccess: async () => {
      setCopyId('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['library-loans'] }),
        queryClient.invalidateQueries({ queryKey: ['library-copies', bookId] }),
        queryClient.invalidateQueries({ queryKey: ['library-books'] }),
      ]);
    },
  });
  const markReturned = useMutation({
    mutationFn: (id: string) => libraryControllerReturn(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['library-loans'] }),
        queryClient.invalidateQueries({ queryKey: ['library-copies'] }),
        queryClient.invalidateQueries({ queryKey: ['library-books'] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library loans & returns"
        description="Issue books to students and mark physical copies returned when handed back."
        actions={
          <Link
            href={booksHref}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Book catalogue
          </Link>
        }
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">Issue a book</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Lesson textbooks are due at the end of the current academic year. Storybooks and other
          books have no fixed due date; mark them returned when received.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            issue.mutate();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Book</span>
            <select
              required
              className="rounded-md border bg-background px-3 py-2"
              value={bookId}
              onChange={(event) => {
                setBookId(event.target.value);
                setCopyId('');
              }}
            >
              <option value="">Choose a book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} ({book.type})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Available copy</span>
            <select
              required
              className="rounded-md border bg-background px-3 py-2"
              value={copyId}
              onChange={(event) => setCopyId(event.target.value)}
              disabled={!bookId || copies.length === 0}
            >
              <option value="">Choose a copy</option>
              {copies.map((copy) => (
                <option key={copy.id} value={copy.id}>
                  {copy.accessionNumber}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <label htmlFor="student-search" className="font-medium">Find student</label>
            <input
              id="student-search"
              className="rounded-md border bg-background px-3 py-2"
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.target.value);
                setStudentId('');
              }}
              placeholder="Name or admission no."
            />
            <select
              required
              aria-label="Student"
              className="rounded-md border bg-background px-3 py-2"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
            >
              <option value="">Choose a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName} · {student.admissionNumber} · {student.class.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!bookId || !copyId || !studentId || issue.isPending}>
              {issue.isPending ? 'Issuing…' : 'Issue book'}
            </Button>
          </div>
        </form>
        {selectedBook ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedBook.type === 'TEXTBOOK'
              ? 'The due date is set from this student’s current class year.'
              : 'No automatic due date is applied.'}
          </p>
        ) : null}
        {issue.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(issue.error, 'Could not issue book')}
          </p>
        ) : null}
        {booksQuery.error || copiesQuery.error || studentsQuery.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(
              booksQuery.error ?? copiesQuery.error ?? studentsQuery.error,
              'Could not load issue options',
            )}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Books currently issued</h2>
        {loansQuery.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {toErrorMessage(loansQuery.error, 'Could not load active loans')}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Book / copy</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{loan.copy.book.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {loan.copy.accessionNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {loan.student.firstName} {loan.student.lastName}
                    <span className="block text-xs text-muted-foreground">
                      {loan.student.admissionNumber} · {loan.student.class.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{dateLabel(loan.issuedAt)}</td>
                  <td className="px-4 py-3">{dateLabel(loan.dueAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markReturned.isPending}
                      onClick={() => markReturned.mutate(loan.id)}
                    >
                      Mark returned
                    </Button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && !loansQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No books are currently issued.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {markReturned.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(markReturned.error, 'Could not mark return')}
          </p>
        ) : null}
      </section>
    </div>
  );
}
