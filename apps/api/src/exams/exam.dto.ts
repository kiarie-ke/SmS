import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EXAM_NAMES, type ExamName } from '@school-system/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { ExamRecord, MarkRecord } from './exam.repository';

export { ExamName };

export class CreateExamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ enum: EXAM_NAMES })
  @IsIn([...EXAM_NAMES])
  name!: ExamName;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks!: number;

  @ApiProperty({ example: '2026-05-10' })
  @IsDateString()
  date!: string;
}

export class UpdateExamDto {
  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks?: number;

  @ApiPropertyOptional({ example: '2026-05-10' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ExamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ enum: EXAM_NAMES })
  @IsOptional()
  @IsIn([...EXAM_NAMES])
  name?: ExamName;
}

export class MarkEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 78 })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  teacherComment?: string;
}

export class RegisterMarksDto {
  @ApiProperty({ type: [MarkEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkEntryDto)
  entries!: MarkEntryDto[];
}

export class ExamDto {
  @ApiProperty() id!: string;
  @ApiProperty() termId!: string;
  @ApiPropertyOptional() termName?: string;
  @ApiProperty() subjectId!: string;
  @ApiPropertyOptional() subjectName?: string;
  @ApiPropertyOptional() subjectCode?: string;
  @ApiProperty() classId!: string;
  @ApiPropertyOptional() className?: string;
  @ApiProperty({ enum: EXAM_NAMES }) name!: ExamName;
  @ApiProperty() maxMarks!: number;
  @ApiProperty() date!: string;
  @ApiProperty() isPublished!: boolean;
  @ApiPropertyOptional({ nullable: true, type: String }) publishedAt!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) lockedByUserId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) lockedAt!: string | null;
  @ApiProperty() markCount!: number;
  @ApiProperty() createdAt!: string;
}

export class MarkDto {
  @ApiProperty() id!: string;
  @ApiProperty() examId!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional() studentName?: string;
  @ApiPropertyOptional() admissionNumber?: string;
  @ApiProperty() score!: number;
  @ApiProperty() grade!: string;
  @ApiPropertyOptional({ nullable: true, type: Number }) points!: number | null;
  @ApiPropertyOptional({ nullable: true, type: String }) teacherComment!: string | null;
  @ApiProperty() createdAt!: string;
}

export function toExamDto(record: ExamRecord): ExamDto {
  return {
    id: record.id,
    termId: record.termId,
    termName: record.term?.name,
    subjectId: record.subjectId,
    subjectName: record.subject?.name,
    subjectCode: record.subject?.code,
    classId: record.classId,
    className: record.class?.name,
    name: record.name,
    maxMarks: record.maxMarks,
    date: record.date.toISOString().slice(0, 10),
    isPublished: record.isPublished,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    lockedByUserId: record.lockedByUserId,
    lockedAt: record.lockedAt ? record.lockedAt.toISOString() : null,
    markCount: record._count?.marks ?? 0,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toMarkDto(record: MarkRecord): MarkDto {
  return {
    id: record.id,
    examId: record.examId,
    studentId: record.studentId,
    studentName: record.student
      ? `${record.student.firstName} ${record.student.lastName}`
      : undefined,
    admissionNumber: record.student?.admissionNumber,
    score: Number(record.score),
    grade: record.grade,
    points: record.points,
    teacherComment: record.teacherComment,
    createdAt: record.createdAt.toISOString(),
  };
}
