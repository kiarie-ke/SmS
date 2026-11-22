import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ClassLevel } from "@school-system/shared";
import type { AuthenticatedUser } from "../common/auth-user";
import {
  LibraryRepositoryPort,
  type BookCopyRecord,
  type BookCreateData,
  type BookLoanListParams,
  type BookLoanRecord,
  type BookRecord,
} from "./library.repository";
import { LibraryService } from "./library.service";

const LIBRARIAN: AuthenticatedUser = {
  id: "librarian-1",
  email: "librarian@example.ac.ke",
  phone: "+254700000001",
  role: "LIBRARIAN",
};

function book(type: BookRecord["type"]): BookRecord {
  return {
    id: "book-1",
    title: "Kenyan school book",
    author: null,
    publisher: null,
    subject: "Mathematics",
    classLevels: ["G4"],
    type,
    isbn: null,
    edition: null,
    isKicdApproved: false,
    sourceUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    copyCount: 1,
    availableCopies: 1,
  };
}

function loan(dueAt: Date | null): BookLoanRecord {
  const copy: BookCopyRecord = {
    id: "copy-1",
    bookId: "book-1",
    accessionNumber: "LIB-001",
    status: "LOANED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    id: "loan-1",
    copyId: copy.id,
    studentId: "student-1",
    issuedByUserId: LIBRARIAN.id,
    returnedByUserId: null,
    issuedAt: new Date(),
    dueAt,
    returnedAt: null,
    createdAt: new Date(),
    copy: {
      ...copy,
      book: {
        id: "book-1",
        title: "Kenyan school book",
        author: null,
        type: "TEXTBOOK",
      },
    },
    student: {
      id: "student-1",
      firstName: "Amina",
      lastName: "Wanjiru",
      admissionNumber: "ADM-001",
      class: { name: "Grade 4 East", level: "G4" },
    },
    issuedBy: { email: LIBRARIAN.email },
    returnedBy: null,
  };
}

class FakeLibraryRepository extends LibraryRepositoryPort {
  currentBook = book("TEXTBOOK");
  currentCopy:
    | (BookCopyRecord & {
        book: {
          id: string;
          title: string;
          type: BookRecord["type"];
          isActive: boolean;
          classLevels: BookRecord["classLevels"];
        };
      })
    | null = {
    id: "copy-1",
    bookId: "book-1",
    accessionNumber: "LIB-001",
    status: "AVAILABLE",
    createdAt: new Date(),
    updatedAt: new Date(),
    book: {
      id: "book-1",
      title: "Kenyan school book",
      type: "TEXTBOOK",
      isActive: true,
      classLevels: ["G4"],
    },
  };
  currentLoan: BookLoanRecord | null = null;
  createdBooks: BookCreateData[] = [];
  issuedData: {
    copyId: string;
    studentId: string;
    issuedByUserId: string;
    dueAt: Date | null;
  } | null = null;
  lastLoanQuery: BookLoanListParams | null = null;

  async listBooks() {
    return { rows: [this.currentBook], total: 1 };
  }
  async findBookById() {
    return this.currentBook;
  }
  async findBookByIsbn() {
    return null;
  }
  async createBook(data: BookCreateData) {
    this.createdBooks.push(data);
    return this.currentBook;
  }
  async updateBook() {
    return this.currentBook;
  }
  async createCopy() {
    return this.currentCopy!;
  }
  async listCopies() {
    return { rows: [], total: 0 };
  }
  async findCopy() {
    return this.currentCopy;
  }
  async findStudentForLoan(): Promise<{
    id: string;
    isDeleted: boolean;
    classLevel: ClassLevel;
    academicYearEndDate: Date;
    academicYearIsCurrent: boolean;
  }> {
    return {
      id: "student-1",
      isDeleted: false,
      classLevel: "G4",
      academicYearEndDate: new Date("2026-12-31T00:00:00.000Z"),
      academicYearIsCurrent: true,
    };
  }
  async createLoan(data: {
    copyId: string;
    studentId: string;
    issuedByUserId: string;
    dueAt: Date | null;
  }) {
    this.issuedData = data;
    this.currentLoan = loan(data.dueAt);
    return this.currentLoan;
  }
  async findLoan() {
    return this.currentLoan;
  }
  async returnLoan() {
    if (!this.currentLoan) return null;
    this.currentLoan = { ...this.currentLoan, returnedAt: new Date() };
    return this.currentLoan;
  }
  async listLoans(params: BookLoanListParams) {
    this.lastLoanQuery = params;
    return {
      rows: this.currentLoan ? [this.currentLoan] : [],
      total: this.currentLoan ? 1 : 0,
    };
  }
  async findStudentIdForUser() {
    return "student-1";
  }
  async listStudentsForLoan() {
    return { rows: [], total: 0 };
  }
}

describe("LibraryService", () => {
  let repo: FakeLibraryRepository;
  let service: LibraryService;

  beforeEach(() => {
    repo = new FakeLibraryRepository();
    service = new LibraryService(repo);
  });

  it("sets textbook loans due at the current academic year end", async () => {
    await service.issue(LIBRARIAN, {
      copyId: "copy-1",
      studentId: "student-1",
    });

    expect(repo.issuedData?.dueAt).toEqual(
      new Date("2026-12-31T00:00:00.000Z"),
    );
    expect(repo.issuedData?.issuedByUserId).toBe(LIBRARIAN.id);
  });

  it("leaves storybook due dates open for the librarian to mark returned manually", async () => {
    repo.currentBook = book("STORY");
    repo.currentCopy!.book.type = "STORY";

    await service.issue(LIBRARIAN, {
      copyId: "copy-1",
      studentId: "student-1",
    });

    expect(repo.issuedData?.dueAt).toBeNull();
  });

  it("rejects textbook issue when the student is not in the current academic year", async () => {
    repo.findStudentForLoan = async () => ({
      id: "student-1",
      isDeleted: false,
      classLevel: "G4",
      academicYearEndDate: new Date("2025-12-31T00:00:00.000Z"),
      academicYearIsCurrent: false,
    });

    await expect(
      service.issue(LIBRARIAN, { copyId: "copy-1", studentId: "student-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a copy that is already on loan", async () => {
    repo.currentCopy!.status = "LOANED";

    await expect(
      service.issue(LIBRARIAN, { copyId: "copy-1", studentId: "student-1" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("does not issue a curriculum book to a student outside its listed levels", async () => {
    repo.currentCopy!.book.classLevels = ["G5"];

    await expect(
      service.issue(LIBRARIAN, { copyId: "copy-1", studentId: "student-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires a source URL when a catalogue entry is marked KICD-approved", async () => {
    expect(() =>
      service.createBook({
        title: "Maths book",
        type: "TEXTBOOK",
        isKicdApproved: true,
      }),
    ).toThrow(BadRequestException);
    await expect(
      service.updateBook("book-1", { isKicdApproved: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("imports valid catalogue metadata and returns row-level validation errors", async () => {
    const file = {
      size: 130,
      originalname: "books.csv",
      buffer: Buffer.from(
        "title,author,publisher,subject,classLevels,type,isbn,edition,kicdApproved,sourceUrl\n" +
          "Maths book,Author,Publisher,Mathematics,G4|G5,TEXTBOOK,9781234567890,2,true,https://kicd.ac.ke/list\n" +
          "Wrong level,Author,Publisher,English,G14,STORY,,,,\n",
      ),
    } as Express.Multer.File;

    const result = await service.importCsv(file);

    expect(result).toMatchObject({ total: 2, imported: 1, failed: 1 });
    expect(result.rows[1]).toMatchObject({ row: 3, success: false });
    expect(repo.createdBooks[0]).toMatchObject({
      title: "Maths book",
      classLevels: ["G4", "G5"],
      isKicdApproved: true,
    });
  });
});
