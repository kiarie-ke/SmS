import { ApiProperty } from '@nestjs/swagger';
import { BOOK_COPY_STATUSES, BOOK_TYPES, CLASS_LEVELS } from '@school-system/shared';

export class BookCatalogueDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) author!: string | null;
  @ApiProperty({ nullable: true, type: String }) publisher!: string | null;
  @ApiProperty({ nullable: true, type: String }) subject!: string | null;
  @ApiProperty({ enum: CLASS_LEVELS, isArray: true }) classLevels!: string[];
  @ApiProperty({ enum: BOOK_TYPES }) type!: string;
  @ApiProperty({ nullable: true, type: String }) isbn!: string | null;
  @ApiProperty({ nullable: true, type: String }) edition!: string | null;
  @ApiProperty() isKicdApproved!: boolean;
  @ApiProperty({ nullable: true, type: String }) sourceUrl!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() copyCount!: number;
  @ApiProperty() availableCopies!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class BookCopyCatalogueDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) bookId!: string;
  @ApiProperty() accessionNumber!: string;
  @ApiProperty({ enum: BOOK_COPY_STATUSES }) status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class LoanBookDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) author!: string | null;
  @ApiProperty({ enum: BOOK_TYPES }) type!: string;
}

export class LoanCopyDto extends BookCopyCatalogueDto {
  @ApiProperty({ type: LoanBookDto }) book!: LoanBookDto;
}

export class LoanStudentClassDto {
  @ApiProperty() name!: string;
  @ApiProperty({ enum: CLASS_LEVELS }) level!: string;
}

export class LibraryStudentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty({ type: LoanStudentClassDto }) class!: LoanStudentClassDto;
}

export class LoanStudentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty({ type: LoanStudentClassDto }) class!: LoanStudentClassDto;
}

export class LoanUserDto {
  @ApiProperty() email!: string;
}

export class BookLoanDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) copyId!: string;
  @ApiProperty({ format: 'uuid' }) studentId!: string;
  @ApiProperty({ format: 'uuid' }) issuedByUserId!: string;
  @ApiProperty({ nullable: true, type: String }) returnedByUserId!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) issuedAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date' }) dueAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) returnedAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: LoanCopyDto }) copy!: LoanCopyDto;
  @ApiProperty({ type: LoanStudentDto }) student!: LoanStudentDto;
  @ApiProperty({ type: LoanUserDto }) issuedBy!: LoanUserDto;
  @ApiProperty({ nullable: true, type: LoanUserDto }) returnedBy!: LoanUserDto | null;
}

export class BookImportRowDto {
  @ApiProperty() row!: number;
  @ApiProperty() success!: boolean;
  @ApiProperty() message!: string;
}

export class BookImportResultDto {
  @ApiProperty() total!: number;
  @ApiProperty() imported!: number;
  @ApiProperty() failed!: number;
  @ApiProperty({ type: BookImportRowDto, isArray: true }) rows!: BookImportRowDto[];
}
