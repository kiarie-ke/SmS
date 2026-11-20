import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CBC_PERFORMANCE_LEVELS, type PerformanceLevel } from '@school-system/shared';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { CbcAssessmentRecord } from './cbc.repository';

export { PerformanceLevel };

export class LearningOutcomeDto {
  @ApiProperty() id!: string;
  @ApiProperty() description!: string;
  @ApiProperty() strandName!: string;
  @ApiProperty() subStrandName!: string;
  @ApiPropertyOptional() subjectName?: string;
  @ApiPropertyOptional() subjectId?: string;
}

export class CreateCbcAssessmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  learningOutcomeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ enum: CBC_PERFORMANCE_LEVELS })
  @IsIn([...CBC_PERFORMANCE_LEVELS])
  performanceLevel!: PerformanceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  teacherComment?: string;
}

export class UpdateCbcAssessmentDto {
  @ApiPropertyOptional({ enum: CBC_PERFORMANCE_LEVELS })
  @IsOptional()
  @IsIn([...CBC_PERFORMANCE_LEVELS])
  performanceLevel?: PerformanceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  teacherComment?: string;
}

export class CbcQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  learningOutcomeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class CbcBulkEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  learningOutcomeId!: string;

  @ApiProperty({ enum: CBC_PERFORMANCE_LEVELS })
  @IsIn([...CBC_PERFORMANCE_LEVELS])
  performanceLevel!: PerformanceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  teacherComment?: string;
}

export class RegisterCbcDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ type: [CbcBulkEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CbcBulkEntryDto)
  entries!: CbcBulkEntryDto[];
}

export class CbcAssessmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional() studentName?: string;
  @ApiPropertyOptional() admissionNumber?: string;
  @ApiPropertyOptional() classId?: string;
  @ApiProperty() learningOutcomeId!: string;
  @ApiPropertyOptional() learningOutcomeDescription?: string;
  @ApiPropertyOptional() subjectName?: string;
  @ApiProperty() termId!: string;
  @ApiPropertyOptional() termName?: string;
  @ApiProperty({ enum: CBC_PERFORMANCE_LEVELS }) performanceLevel!: PerformanceLevel;
  @ApiPropertyOptional({ nullable: true, type: String }) teacherComment!: string | null;
  @ApiProperty() assessedAt!: string;
  @ApiProperty() createdAt!: string;
}

export function toCbcDto(record: CbcAssessmentRecord): CbcAssessmentDto {
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.student ? `${record.student.firstName} ${record.student.lastName}` : undefined,
    admissionNumber: record.student?.admissionNumber,
    classId: record.student?.classId,
    learningOutcomeId: record.learningOutcomeId,
    learningOutcomeDescription: record.learningOutcome?.description,
    subjectName: record.learningOutcome?.strand?.subject?.name,
    termId: record.termId,
    termName: record.term?.name,
    performanceLevel: record.performanceLevel,
    teacherComment: record.teacherComment,
    assessedAt: record.assessedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
  };
}
