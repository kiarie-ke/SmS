import { Injectable } from "@nestjs/common";
import type {
  BookCopyStatus,
  BookType,
  ClassLevel,
} from "@school-system/shared";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface BookCreateData {
  title: string;
  author: string | null;
  publisher: string | null;
  subject: string | null;
  classLevels: ClassLevel[];
  type: BookType;
  isbn: string | null;
  edition: string | null;
  isKicdApproved: boolean;
  sourceUrl: string | null;
}

export type BookUpdateData = Partial<BookCreateData> & { isActive?: boolean };

export interface BookRecord extends BookCreateData {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  copyCount: number;
  availableCopies: number;
}

export interface BookCopyRecord {
  id: string;
  bookId: string;
  accessionNumber: string;
  status: BookCopyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryStudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  class: { name: string; level: ClassLevel };
}

export interface BookLoanRecord {
  id: string;
  copyId: string;
  studentId: string;
  issuedByUserId: string;
  returnedByUserId: string | null;
  issuedAt: Date;
  dueAt: Date | null;
  returnedAt: Date | null;
  createdAt: Date;
  copy: BookCopyRecord & {
    book: Pick<BookRecord, "id" | "title" | "author" | "type">;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    class: { name: string; level: ClassLevel };
  };
  issuedBy: { email: string };
  returnedBy: { email: string } | null;
}

export interface BookListParams {
  skip: number;
  take: number;
  search?: string;
  type?: BookType;
  classLevel?: ClassLevel;
  isActive?: boolean;
}

export interface BookLoanListParams {
  skip: number;
  take: number;
  studentId?: string;
  search?: string;
  status?: "ACTIVE" | "RETURNED";
}

export abstract class LibraryRepositoryPort {
  abstract listBooks(
    params: BookListParams,
  ): Promise<{ rows: BookRecord[]; total: number }>;
  abstract findBookById(id: string): Promise<BookRecord | null>;
  abstract findBookByIsbn(isbn: string): Promise<{ id: string } | null>;
  abstract createBook(data: BookCreateData): Promise<BookRecord>;
  abstract updateBook(id: string, data: BookUpdateData): Promise<BookRecord>;
  abstract createCopy(
    bookId: string,
    accessionNumber: string,
  ): Promise<BookCopyRecord>;
  abstract listCopies(
    bookId: string,
    params: { skip: number; take: number; status?: BookCopyStatus },
  ): Promise<{ rows: BookCopyRecord[]; total: number }>;
  abstract findCopy(id: string): Promise<
    | (BookCopyRecord & {
        book: Pick<
          BookRecord,
          "id" | "title" | "type" | "isActive" | "classLevels"
        >;
      })
    | null
  >;
  abstract findStudentForLoan(studentId: string): Promise<{
    id: string;
    isDeleted: boolean;
    classLevel: ClassLevel;
    academicYearEndDate: Date;
    academicYearIsCurrent: boolean;
  } | null>;
  abstract createLoan(data: {
    copyId: string;
    studentId: string;
    issuedByUserId: string;
    dueAt: Date | null;
  }): Promise<BookLoanRecord | null>;
  abstract findLoan(id: string): Promise<BookLoanRecord | null>;
  abstract returnLoan(
    id: string,
    returnedByUserId: string,
  ): Promise<BookLoanRecord | null>;
  abstract listLoans(
    params: BookLoanListParams,
  ): Promise<{ rows: BookLoanRecord[]; total: number }>;
  abstract findStudentIdForUser(userId: string): Promise<string | null>;
  abstract listStudentsForLoan(params: {
    skip: number;
    take: number;
    search?: string;
  }): Promise<{ rows: LibraryStudentRecord[]; total: number }>;
}

const bookInclude = {
  _count: { select: { copies: true } },
  copies: { where: { status: "AVAILABLE" as const }, select: { id: true } },
} satisfies Prisma.BookInclude;

const loanInclude = {
  copy: {
    include: {
      book: {
        select: { id: true, title: true, author: true, type: true },
      },
    },
  },
  student: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
      class: { select: { name: true, level: true } },
    },
  },
  issuedBy: { select: { email: true } },
  returnedBy: { select: { email: true } },
} satisfies Prisma.BookLoanInclude;

function toBookRecord(
  book: Prisma.BookGetPayload<{ include: typeof bookInclude }>,
): BookRecord {
  const { _count, copies, ...record } = book;
  return {
    ...record,
    copyCount: _count.copies,
    availableCopies: copies.length,
  };
}

@Injectable()
export class LibraryRepository extends LibraryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listBooks(params: BookListParams) {
    const filters: Prisma.BookWhereInput[] = [];
    if (params.classLevel) {
      filters.push({
        OR: [
          { classLevels: { has: params.classLevel } },
          { classLevels: { isEmpty: true } },
        ],
      });
    }
    if (params.search) {
      filters.push({
        OR: [
          { title: { contains: params.search, mode: "insensitive" } },
          { author: { contains: params.search, mode: "insensitive" } },
          { publisher: { contains: params.search, mode: "insensitive" } },
          { subject: { contains: params.search, mode: "insensitive" } },
          { isbn: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }
    const where: Prisma.BookWhereInput = {
      ...(params.isActive === undefined
        ? { isActive: true }
        : { isActive: params.isActive }),
      ...(params.type ? { type: params.type } : {}),
      ...(filters.length > 0 ? { AND: filters } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.book.findMany({
        where,
        include: bookInclude,
        orderBy: { title: "asc" },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.book.count({ where }),
    ]);
    return { rows: rows.map(toBookRecord), total };
  }

  async findBookById(id: string): Promise<BookRecord | null> {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: bookInclude,
    });
    return book ? toBookRecord(book) : null;
  }

  findBookByIsbn(isbn: string) {
    return this.prisma.book.findUnique({
      where: { isbn },
      select: { id: true },
    });
  }

  async createBook(data: BookCreateData): Promise<BookRecord> {
    return toBookRecord(
      await this.prisma.book.create({ data, include: bookInclude }),
    );
  }

  async updateBook(id: string, data: BookUpdateData): Promise<BookRecord> {
    return toBookRecord(
      await this.prisma.book.update({
        where: { id },
        data,
        include: bookInclude,
      }),
    );
  }

  createCopy(bookId: string, accessionNumber: string): Promise<BookCopyRecord> {
    return this.prisma.bookCopy.create({ data: { bookId, accessionNumber } });
  }

  async listCopies(
    bookId: string,
    params: { skip: number; take: number; status?: BookCopyStatus },
  ) {
    const where: Prisma.BookCopyWhereInput = {
      bookId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bookCopy.findMany({
        where,
        orderBy: { accessionNumber: "asc" },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.bookCopy.count({ where }),
    ]);
    return { rows, total };
  }

  findCopy(id: string) {
    return this.prisma.bookCopy.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            type: true,
            isActive: true,
            classLevels: true,
          },
        },
      },
    });
  }

  findStudentForLoan(studentId: string) {
    return this.prisma.student
      .findUnique({
        where: { id: studentId },
        select: {
          id: true,
          isDeleted: true,
          class: {
            select: {
              level: true,
              academicYear: { select: { endDate: true, isCurrent: true } },
            },
          },
        },
      })
      .then((student) =>
        student
          ? {
              id: student.id,
              isDeleted: student.isDeleted,
              classLevel: student.class.level,
              academicYearEndDate: student.class.academicYear.endDate,
              academicYearIsCurrent: student.class.academicYear.isCurrent,
            }
          : null,
      );
  }

  async createLoan(data: {
    copyId: string;
    studentId: string;
    issuedByUserId: string;
    dueAt: Date | null;
  }): Promise<BookLoanRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.bookCopy.updateMany({
        where: { id: data.copyId, status: "AVAILABLE" },
        data: { status: "LOANED" },
      });
      if (claimed.count !== 1) return null;
      return transaction.bookLoan.create({
        data,
        include: loanInclude,
      });
    });
  }

  findLoan(id: string): Promise<BookLoanRecord | null> {
    return this.prisma.bookLoan.findUnique({
      where: { id },
      include: loanInclude,
    });
  }

  async returnLoan(
    id: string,
    returnedByUserId: string,
  ): Promise<BookLoanRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const loan = await transaction.bookLoan.findUnique({
        where: { id },
        select: { id: true, copyId: true, returnedAt: true },
      });
      if (!loan || loan.returnedAt) return null;

      const updated = await transaction.bookLoan.updateMany({
        where: { id, returnedAt: null },
        data: { returnedAt: new Date(), returnedByUserId },
      });
      if (updated.count !== 1) return null;

      await transaction.bookCopy.update({
        where: { id: loan.copyId },
        data: { status: "AVAILABLE" },
      });
      return transaction.bookLoan.findUnique({
        where: { id },
        include: loanInclude,
      });
    });
  }

  async listLoans(params: BookLoanListParams) {
    const where: Prisma.BookLoanWhereInput = {
      ...(params.studentId ? { studentId: params.studentId } : {}),
      ...(params.status === "ACTIVE" ? { returnedAt: null } : {}),
      ...(params.status === "RETURNED" ? { returnedAt: { not: null } } : {}),
      ...(params.search
        ? {
            OR: [
              {
                student: {
                  firstName: { contains: params.search, mode: "insensitive" },
                },
              },
              {
                student: {
                  lastName: { contains: params.search, mode: "insensitive" },
                },
              },
              {
                student: {
                  admissionNumber: {
                    contains: params.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                copy: {
                  book: {
                    title: { contains: params.search, mode: "insensitive" },
                  },
                },
              },
              {
                copy: {
                  accessionNumber: {
                    contains: params.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bookLoan.findMany({
        where,
        include: loanInclude,
        orderBy: { issuedAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.bookLoan.count({ where }),
    ]);
    return { rows, total };
  }

  async findStudentIdForUser(userId: string): Promise<string | null> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  async listStudentsForLoan(params: {
    skip: number;
    take: number;
    search?: string;
  }) {
    const where: Prisma.StudentWhereInput = {
      isDeleted: false,
      ...(params.search
        ? {
            OR: [
              {
                admissionNumber: {
                  contains: params.search,
                  mode: "insensitive",
                },
              },
              { firstName: { contains: params.search, mode: "insensitive" } },
              { lastName: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          class: { select: { name: true, level: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.student.count({ where }),
    ]);
    return { rows, total };
  }
}
