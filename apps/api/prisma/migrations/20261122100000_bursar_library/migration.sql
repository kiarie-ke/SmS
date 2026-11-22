-- Align the pre-existing fee payment column drift without changing stored data.
ALTER TABLE "fee_payments" ALTER COLUMN "recordedByUserId" DROP NOT NULL;

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "BookType" AS ENUM ('TEXTBOOK', 'STORY', 'OTHER');

-- CreateEnum
CREATE TYPE "BookCopyStatus" AS ENUM ('AVAILABLE', 'LOANED', 'LOST', 'DAMAGED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BURSAR';
ALTER TYPE "Role" ADD VALUE 'LIBRARIAN';

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" UUID NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "occurredAt" DATE NOT NULL,
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "subject" TEXT,
    "classLevels" "ClassLevel"[],
    "type" "BookType" NOT NULL,
    "isbn" TEXT,
    "edition" TEXT,
    "isKicdApproved" BOOLEAN NOT NULL DEFAULT false,
    "sourceUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "status" "BookCopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_loans" (
    "id" UUID NOT NULL,
    "copyId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "issuedByUserId" UUID NOT NULL,
    "returnedByUserId" UUID,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATE,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_transactions_type_occurredAt_idx" ON "finance_transactions"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "finance_transactions_category_idx" ON "finance_transactions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_type_isActive_idx" ON "books"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_accessionNumber_key" ON "book_copies"("accessionNumber");

-- CreateIndex
CREATE INDEX "book_copies_bookId_status_idx" ON "book_copies"("bookId", "status");

-- CreateIndex
CREATE INDEX "book_loans_studentId_returnedAt_idx" ON "book_loans"("studentId", "returnedAt");

-- CreateIndex
CREATE INDEX "book_loans_copyId_returnedAt_idx" ON "book_loans"("copyId", "returnedAt");

-- CreateIndex
CREATE INDEX "book_loans_dueAt_idx" ON "book_loans"("dueAt");

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "book_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_returnedByUserId_fkey" FOREIGN KEY ("returnedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
