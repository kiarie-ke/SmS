import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CLASS_LEVELS } from "@school-system/shared";
import type { BookType, ClassLevel } from "@school-system/shared";
import Papa from "papaparse";
import type { AuthenticatedUser } from "../common/auth-user";
import { paginate } from "../common/pagination";
import {
  BookLoanQueryDto,
  BookCopyQueryDto,
  BookQueryDto,
  CreateBookCopyDto,
  CreateBookDto,
  IssueBookDto,
  LibraryStudentQueryDto,
  UpdateBookDto,
} from "./library.dto";
import {
  LibraryRepositoryPort,
  type BookCreateData,
} from "./library.repository";

const BOOK_TYPES: readonly BookType[] = ["TEXTBOOK", "STORY", "OTHER"];
const MAX_IMPORT_ROWS = 500;

function toOptionalText(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function toCreateData(dto: CreateBookDto): BookCreateData {
  return {
    title: dto.title.trim(),
    author: toOptionalText(dto.author),
    publisher: toOptionalText(dto.publisher),
    subject: toOptionalText(dto.subject),
    classLevels: dto.classLevels ?? [],
    type: dto.type,
    isbn: toOptionalText(dto.isbn),
    edition: toOptionalText(dto.edition),
    isKicdApproved: dto.isKicdApproved ?? false,
    sourceUrl: toOptionalText(dto.sourceUrl),
  };
}

function toUpdateData(dto: UpdateBookDto) {
  const data: Partial<BookCreateData> & { isActive?: boolean } = {};
  if (dto.title !== undefined) data.title = dto.title.trim();
  if (dto.author !== undefined) data.author = toOptionalText(dto.author);
  if (dto.publisher !== undefined)
    data.publisher = toOptionalText(dto.publisher);
  if (dto.subject !== undefined) data.subject = toOptionalText(dto.subject);
  if (dto.classLevels !== undefined) data.classLevels = dto.classLevels;
  if (dto.type !== undefined) data.type = dto.type;
  if (dto.isbn !== undefined) data.isbn = toOptionalText(dto.isbn);
  if (dto.edition !== undefined) data.edition = toOptionalText(dto.edition);
  if (dto.isKicdApproved !== undefined)
    data.isKicdApproved = dto.isKicdApproved;
  if (dto.sourceUrl !== undefined)
    data.sourceUrl = toOptionalText(dto.sourceUrl);
  if (dto.isActive !== undefined) data.isActive = dto.isActive;
  return data;
}

@Injectable()
export class LibraryService {
  constructor(private readonly library: LibraryRepositoryPort) {}

  async listBooks(query: BookQueryDto) {
    const { rows, total } = await this.library.listBooks({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      type: query.type,
      classLevel: query.classLevel,
      isActive: query.isActive,
    });
    return paginate(rows, total, query);
  }

  createBook(dto: CreateBookDto) {
    if (dto.isKicdApproved && !dto.sourceUrl?.trim()) {
      throw new BadRequestException(
        "A KICD source URL is required for verified catalogue entries",
      );
    }
    return this.library.createBook(toCreateData(dto));
  }

  async updateBook(id: string, dto: UpdateBookDto) {
    const existing = await this.library.findBookById(id);
    if (!existing) throw new NotFoundException("Book not found");
    const sourceUrl =
      dto.sourceUrl === undefined ? existing.sourceUrl : dto.sourceUrl;
    if (dto.isKicdApproved === true && !sourceUrl?.trim()) {
      throw new BadRequestException(
        "A KICD source URL is required for verified catalogue entries",
      );
    }
    return this.library.updateBook(id, toUpdateData(dto));
  }

  async createCopy(bookId: string, dto: CreateBookCopyDto) {
    const book = await this.library.findBookById(bookId);
    if (!book || !book.isActive)
      throw new NotFoundException("Active book not found");
    return this.library.createCopy(bookId, dto.accessionNumber.trim());
  }

  async listCopies(bookId: string, query: BookCopyQueryDto) {
    if (!(await this.library.findBookById(bookId)))
      throw new NotFoundException("Book not found");
    const { rows, total } = await this.library.listCopies(bookId, {
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return paginate(rows, total, query);
  }

  async listStudents(query: LibraryStudentQueryDto) {
    const { rows, total } = await this.library.listStudentsForLoan({
      skip: query.skip,
      take: query.limit,
      search: query.search,
    });
    return paginate(rows, total, query);
  }

  async issue(user: AuthenticatedUser, dto: IssueBookDto) {
    const [copy, student] = await Promise.all([
      this.library.findCopy(dto.copyId),
      this.library.findStudentForLoan(dto.studentId),
    ]);
    if (!copy) throw new NotFoundException("Book copy not found");
    if (!copy.book.isActive)
      throw new ConflictException("This book is not active");
    if (!student || student.isDeleted)
      throw new NotFoundException("Active student not found");
    if (
      copy.book.classLevels.length > 0 &&
      !copy.book.classLevels.includes(student.classLevel)
    ) {
      throw new BadRequestException(
        "This book is not listed for the student’s class level",
      );
    }
    if (copy.status !== "AVAILABLE") {
      throw new ConflictException("This copy is not available");
    }

    let dueAt: Date | null = null;
    if (copy.book.type === "TEXTBOOK") {
      if (!student.academicYearIsCurrent) {
        throw new BadRequestException(
          "Textbooks can only be issued to students in the current academic year",
        );
      }
      dueAt = student.academicYearEndDate;
    }

    const loan = await this.library.createLoan({
      copyId: dto.copyId,
      studentId: dto.studentId,
      issuedByUserId: user.id,
      dueAt,
    });
    if (!loan)
      throw new ConflictException(
        "This copy has just been issued to another student",
      );
    return loan;
  }

  async return(id: string, user: AuthenticatedUser) {
    const existing = await this.library.findLoan(id);
    if (!existing) throw new NotFoundException("Book loan not found");
    if (existing.returnedAt)
      throw new ConflictException("This book has already been returned");

    const loan = await this.library.returnLoan(id, user.id);
    if (!loan)
      throw new ConflictException("This book has already been returned");
    return loan;
  }

  async listLoans(query: BookLoanQueryDto) {
    const { rows, total } = await this.library.listLoans({
      skip: query.skip,
      take: query.limit,
      search: query.search,
      status: query.status,
    });
    return paginate(rows, total, query);
  }

  async myLoans(user: AuthenticatedUser, query: BookLoanQueryDto) {
    const studentId = await this.library.findStudentIdForUser(user.id);
    if (!studentId)
      throw new NotFoundException(
        "No student profile is linked to this account",
      );

    const { rows, total } = await this.library.listLoans({
      skip: query.skip,
      take: query.limit,
      studentId,
      status: query.status,
    });
    return paginate(rows, total, query);
  }

  async importCsv(file: Express.Multer.File | undefined) {
    if (!file || file.size === 0)
      throw new BadRequestException("A non-empty CSV file is required");
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      throw new BadRequestException("Upload a .csv file");
    }

    const parsed = Papa.parse<Record<string, string>>(
      file.buffer.toString("utf8"),
      {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      },
    );
    if (parsed.errors.length > 0) {
      throw new BadRequestException(
        `CSV could not be parsed: ${parsed.errors[0].message}`,
      );
    }
    if (parsed.data.length === 0)
      throw new BadRequestException("The CSV file has no book rows");
    if (parsed.data.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `CSV import is limited to ${MAX_IMPORT_ROWS} rows`,
      );
    }

    const rows: Array<{ row: number; success: boolean; message: string }> = [];
    for (const [index, raw] of parsed.data.entries()) {
      const row = index + 2;
      const invalid = this.validateCsvRow(raw);
      if (invalid) {
        rows.push({ row, success: false, message: invalid });
        continue;
      }
      const data = this.csvRowToBook(raw);
      if (data.isbn && (await this.library.findBookByIsbn(data.isbn))) {
        rows.push({
          row,
          success: false,
          message: `ISBN ${data.isbn} already exists`,
        });
        continue;
      }
      await this.library.createBook(data);
      rows.push({ row, success: true, message: "Book imported" });
    }

    return {
      total: rows.length,
      imported: rows.filter((row) => row.success).length,
      failed: rows.filter((row) => !row.success).length,
      rows,
    };
  }

  private validateCsvRow(row: Record<string, string>): string | null {
    if (!row.title?.trim()) return "title is required";
    if (row.title.trim().length > 200)
      return "title must be at most 200 characters";
    const type = row.type?.trim().toUpperCase();
    if (!BOOK_TYPES.includes(type as BookType)) {
      return "type must be TEXTBOOK, STORY or OTHER";
    }
    if (row.isbn?.trim().length > 30)
      return "isbn must be at most 30 characters";
    if (row.author?.trim().length > 200)
      return "author must be at most 200 characters";
    if (row.publisher?.trim().length > 120)
      return "publisher must be at most 120 characters";
    if (row.subject?.trim().length > 120)
      return "subject must be at most 120 characters";
    if (row.edition?.trim().length > 60)
      return "edition must be at most 60 characters";
    if (row.sourceurl?.trim().length > 500)
      return "sourceUrl must be at most 500 characters";
    if (row.classlevels?.trim()) {
      const levels = row.classlevels
        .split("|")
        .map((level) => level.trim().toUpperCase());
      const invalid = levels.find(
        (level) => !CLASS_LEVELS.includes(level as ClassLevel),
      );
      if (invalid) return `Unknown class level: ${invalid}`;
    }
    if (
      row.kicdapproved &&
      !["true", "false"].includes(row.kicdapproved.trim().toLowerCase())
    ) {
      return "kicdApproved must be true or false";
    }
    if (
      row.kicdapproved?.trim().toLowerCase() === "true" &&
      !row.sourceurl?.trim()
    ) {
      return "sourceUrl is required when kicdApproved is true";
    }
    if (row.sourceurl?.trim()) {
      try {
        const source = new URL(row.sourceurl);
        if (source.protocol !== "https:" && source.protocol !== "http:") {
          return "sourceUrl must use HTTP or HTTPS";
        }
      } catch {
        return "sourceUrl must be a valid URL";
      }
    }
    return null;
  }

  private csvRowToBook(row: Record<string, string>): BookCreateData {
    return {
      title: row.title.trim(),
      author: toOptionalText(row.author),
      publisher: toOptionalText(row.publisher),
      subject: toOptionalText(row.subject),
      classLevels: row.classlevels
        ? row.classlevels
            .split("|")
            .map((level) => level.trim().toUpperCase() as ClassLevel)
        : [],
      type: row.type.trim().toUpperCase() as BookType,
      isbn: toOptionalText(row.isbn),
      edition: toOptionalText(row.edition),
      isKicdApproved: row.kicdapproved?.trim().toLowerCase() === "true",
      sourceUrl: toOptionalText(row.sourceurl),
    };
  }
}
