import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REPORT_TEMPLATES, type ReportTemplate } from '@school-system/shared';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { ReportCardRecord } from './report-card.repository';

export { ReportTemplate };

export class GenerateReportCardsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  termId!: string;
}

export class UpdateReportCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  teacherComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  principalComment?: string;
}

export class ReportCardQueryDto extends PaginationQueryDto {
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
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  published?: boolean;
}

export class ReportCardMarkDto {
  @ApiProperty() subjectName!: string;
  @ApiProperty() examName!: string;
  @ApiProperty() score!: number;
  @ApiProperty() maxMarks!: number;
  @ApiProperty() grade!: string;
  @ApiPropertyOptional({ nullable: true, type: Number }) points!: number | null;
}

export class ReportCardCbcDto {
  @ApiProperty() subjectName!: string;
  @ApiProperty() learningOutcomeDescription!: string;
  @ApiProperty() performanceLevel!: string;
}

export class ReportCardDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional() studentName?: string;
  @ApiPropertyOptional() admissionNumber?: string;
  @ApiProperty() termId!: string;
  @ApiPropertyOptional() termName?: string;
  @ApiProperty() classId!: string;
  @ApiPropertyOptional() className?: string;
  @ApiProperty({ enum: REPORT_TEMPLATES }) template!: ReportTemplate;
  @ApiPropertyOptional({ nullable: true, type: String }) teacherComment!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) principalComment!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) publishedAt!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) pdfUrl!: string | null;
  @ApiProperty() createdAt!: string;

  @ApiPropertyOptional({ type: [ReportCardMarkDto] }) marks?: ReportCardMarkDto[];
  @ApiPropertyOptional({ type: [ReportCardCbcDto] }) cbcAssessments?: ReportCardCbcDto[];
  @ApiPropertyOptional() overallPercentage?: number;
  @ApiPropertyOptional() overallGrade?: string;
  @ApiPropertyOptional() rank?: number;
  @ApiPropertyOptional() totalStudents?: number;
}

export function toReportCardDto(record: ReportCardRecord): ReportCardDto {
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.student ? `${record.student.firstName} ${record.student.lastName}` : undefined,
    admissionNumber: record.student?.admissionNumber,
    termId: record.termId,
    termName: record.term?.name,
    classId: record.classId,
    className: record.class?.name,
    template: record.template,
    teacherComment: record.teacherComment,
    principalComment: record.principalComment,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    pdfUrl: record.pdfUrl,
    createdAt: record.createdAt.toISOString(),
  };
}
