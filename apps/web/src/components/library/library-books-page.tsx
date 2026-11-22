'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CLASS_LEVELS } from '@school-system/shared';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import {
  libraryControllerCreateBook,
  libraryControllerCreateCopy,
  libraryControllerImportCsv,
  libraryControllerListBooks,
} from '@/lib/api/generated/endpoints';
import type {
  BookCatalogueDto,
  CreateBookDto,
  CreateBookDtoClassLevelsItem,
  CreateBookDtoType,
} from '@/lib/api/generated/models';
import { toErrorMessage } from '@/lib/api/errors';
import { useApiQuery } from '@/lib/api/use-api-query';

const EMPTY_BOOK: CreateBookDto = {
  title: '',
  type: 'TEXTBOOK',
  classLevels: [],
  isKicdApproved: false,
};

const CSV_HEADER =
  'title,author,publisher,subject,classLevels,type,isbn,edition,kicdApproved,sourceUrl\n';

export function LibraryBooksPage({
  loansHref = '/librarian/loans',
}: {
  loansHref?: string;
}) {
  const queryClient = useQueryClient();
  const [bookForm, setBookForm] = useState<CreateBookDto>(EMPTY_BOOK);
  const [search, setSearch] = useState('');
  const [copyForBook, setCopyForBook] = useState<string | null>(null);
  const [accessionNumber, setAccessionNumber] = useState('');
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    rows: Array<{ row: number; success: boolean; message: string }>;
  } | null>(null);

  const booksQuery = useApiQuery(['library-books', search], () =>
    libraryControllerListBooks({ search: search || undefined, limit: 100 }),
  );
  const books: BookCatalogueDto[] = booksQuery.data?.data ?? [];

  const createBook = useMutation({
    mutationFn: (book: CreateBookDto) => libraryControllerCreateBook(book),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
      setBookForm(EMPTY_BOOK);
    },
  });
  const addCopy = useMutation({
    mutationFn: ({ id, accessionNumber }: { id: string; accessionNumber: string }) =>
      libraryControllerCreateCopy(id, { accessionNumber }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
      setCopyForBook(null);
      setAccessionNumber('');
    },
  });
  const importCsv = useMutation({
    mutationFn: (file: File) => libraryControllerImportCsv({ file }),
    onSuccess: async (response) => {
      setImportResult(response.data);
      await queryClient.invalidateQueries({ queryKey: ['library-books'] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book catalogue"
        description="Manage curriculum book metadata and physical school copies. Book contents are not stored."
        actions={
          <Link
            href={loansHref}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Loans & returns
          </Link>
        }
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-2 font-semibold">KICD-approved course materials</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          The official KICD page links approved coursebook lists by curriculum level. The lists are
          published as PDFs; verify titles with KICD before marking them approved in the catalogue.
        </p>
        <a
          className="text-sm font-medium text-primary underline"
          href="https://kicd.ac.ke/approved-cbc-course-materials/"
          target="_blank"
          rel="noreferrer"
        >
          Open KICD approved course materials
        </a>
        <a
          className="ml-4 text-sm font-medium text-primary underline"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_HEADER)}`}
          download="school-book-catalogue-template.csv"
        >
          Download CSV template
        </a>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Import book metadata</h2>
            <p className="text-sm text-muted-foreground">
              Up to 500 rows per CSV. Separate multiple class levels with | (for example G4|G5).
            </p>
          </div>
          <label className="cursor-pointer rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
            {importCsv.isPending ? 'Importing…' : 'Choose CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importCsv.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importCsv.mutate(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
        {importCsv.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(importCsv.error, 'Could not import catalogue')}
          </p>
        ) : null}
        {importResult ? (
          <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
            Imported {importResult.imported}; failed {importResult.failed}.
            {importResult.failed > 0 ? (
              <ul className="mt-2 list-inside list-disc">
                {importResult.rows
                  .filter((row) => !row.success)
                  .map((row) => (
                    <li key={row.row}>
                      Row {row.row}: {row.message}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 font-semibold">Add a catalogue entry</h2>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            createBook.mutate(bookForm);
          }}
        >
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Book title</span>
            <input
              required
              maxLength={200}
              className="rounded-md border bg-background px-3 py-2"
              value={bookForm.title}
              onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Type</span>
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={bookForm.type}
              onChange={(event) =>
                setBookForm({ ...bookForm, type: event.target.value as CreateBookDtoType })
              }
            >
              <option value="TEXTBOOK">Lesson textbook</option>
              <option value="STORY">Storybook</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          {[
            ['author', 'Author'],
            ['publisher', 'Publisher'],
            ['subject', 'Subject'],
            ['isbn', 'ISBN'],
            ['edition', 'Edition'],
            ['sourceUrl', 'KICD source URL'],
          ].map(([field, label]) => (
            <label key={field} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{label}</span>
              <input
                maxLength={field === 'sourceUrl' ? 500 : 200}
                type={field === 'sourceUrl' ? 'url' : 'text'}
                className="rounded-md border bg-background px-3 py-2"
                value={String(bookForm[field as keyof CreateBookDto] ?? '')}
                onChange={(event) =>
                  setBookForm({
                    ...bookForm,
                    [field]: event.target.value || undefined,
                  })
                }
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Curriculum levels (select multiple)</span>
            <select
              multiple
              className="min-h-28 rounded-md border bg-background px-3 py-2"
              value={bookForm.classLevels ?? []}
              onChange={(event) =>
                setBookForm({
                  ...bookForm,
                  classLevels: Array.from(event.target.selectedOptions, (option) =>
                    option.value as CreateBookDtoClassLevelsItem,
                  ),
                })
              }
            >
              {CLASS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={bookForm.isKicdApproved ?? false}
              onChange={(event) =>
                setBookForm({ ...bookForm, isKicdApproved: event.target.checked })
              }
            />
            KICD-approved metadata verified
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={createBook.isPending}>
              {createBook.isPending ? 'Saving…' : 'Add book'}
            </Button>
          </div>
        </form>
        {createBook.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(createBook.error, 'Could not create book')}
          </p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Catalogue inventory</h2>
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, author, subject or ISBN"
            aria-label="Search book catalogue"
          />
        </div>
        {booksQuery.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {toErrorMessage(booksQuery.error, 'Could not load catalogue')}
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Type / levels</th>
                <th className="px-4 py-3">KICD</th>
                <th className="px-4 py-3">Copies</th>
                <th className="px-4 py-3">Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {books.map((book) => (
                <tr key={book.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{book.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[book.author, book.publisher, book.subject].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {book.type}
                    <span className="block text-xs text-muted-foreground">
                      {book.classLevels.join(', ') || 'All levels'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{book.isKicdApproved ? 'Verified' : 'Not verified'}</td>
                  <td className="px-4 py-3">
                    {book.availableCopies} available / {book.copyCount} total
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCopyForBook(book.id)}
                    >
                      Add physical copy
                    </Button>
                    {copyForBook === book.id ? (
                      <form
                        className="mt-2 flex gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          addCopy.mutate({ id: book.id, accessionNumber });
                        }}
                      >
                        <input
                          required
                          maxLength={50}
                          className="min-w-32 rounded-md border bg-background px-2 py-1 text-xs"
                          placeholder="Accession number"
                          value={accessionNumber}
                          onChange={(event) => setAccessionNumber(event.target.value)}
                        />
                        <Button size="sm" type="submit" disabled={addCopy.isPending}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          onClick={() => setCopyForBook(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {books.length === 0 && !booksQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No books match. Add a verified title or import approved metadata from CSV.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {addCopy.error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {toErrorMessage(addCopy.error, 'Could not add physical copy')}
          </p>
        ) : null}
      </section>
    </div>
  );
}
