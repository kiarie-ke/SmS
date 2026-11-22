import { LibraryBooksPage } from '@/components/library/library-books-page';

export default function AdminLibraryPage() {
  return <LibraryBooksPage loansHref="/admin/library/loans" />;
}
