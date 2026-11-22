import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BOOK_TYPES,
  BOOK_COPY_STATUSES,
  CLASS_LEVELS,
  type BookType,
  type BookCopyStatus,
  type ClassLevel,
} from '@school-system/shared';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

function parseBoolean(value: unknown): unknown {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}

export class CreateBookDto {
  @ApiProperty({ example: 'KLB Visionary Mathematics Learner Book Grade 4' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisher?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiPropertyOptional({ enum: CLASS_LEVELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn([...CLASS_LEVELS], { each: true })
  classLevels?: ClassLevel[];

  @ApiProperty({ enum: BOOK_TYPES })
  @IsIn([...BOOK_TYPES])
  type!: BookType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  isbn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  edition?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  isKicdApproved?: boolean;

  @ApiPropertyOptional({ description: 'Link to the official KICD listing or source' })
  @IsOptional()
  @IsUrl({ require_tld: true, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  sourceUrl?: string;
}

export class UpdateBookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisher?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string | null;

  @ApiPropertyOptional({ enum: CLASS_LEVELS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsIn([...CLASS_LEVELS], { each: true })
  classLevels?: ClassLevel[];

  @ApiPropertyOptional({ enum: BOOK_TYPES })
  @IsOptional()
  @IsIn([...BOOK_TYPES])
  type?: BookType;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  isbn?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  edition?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isKicdApproved?: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl({ require_tld: true, require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  sourceUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BookQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BOOK_TYPES })
  @IsOptional()
  @IsIn([...BOOK_TYPES])
  type?: BookType;

  @ApiPropertyOptional({ enum: CLASS_LEVELS })
  @IsOptional()
  @IsIn([...CLASS_LEVELS])
  classLevel?: ClassLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}

export class CreateBookCopyDto {
  @ApiProperty({ example: 'LIB-2026-0001' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  accessionNumber!: string;
}

export class BookCopyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BOOK_COPY_STATUSES })
  @IsOptional()
  @IsIn([...BOOK_COPY_STATUSES])
  status?: BookCopyStatus;
}

export class LibraryStudentQueryDto extends PaginationQueryDto {}

export class IssueBookDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  copyId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;
}

export class BookLoanQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'RETURNED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'RETURNED'])
  status?: 'ACTIVE' | 'RETURNED';
}
