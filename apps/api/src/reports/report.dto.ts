import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ReportSummaryQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Limit term-based reports to this term' })
  @IsOptional()
  @IsUUID()
  termId?: string;
}

export class ReportTermDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() academicYearName!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
}

export class EnrollmentReportRowDto {
  @ApiProperty() className!: string;
  @ApiProperty() classLevel!: string;
  @ApiProperty() studentCount!: number;
}

export class AttendanceReportRowDto {
  @ApiProperty() status!: string;
  @ApiProperty() count!: number;
}

export class AcademicReportRowDto {
  @ApiProperty() grade!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ nullable: true, type: Number }) averageScore!: number | null;
}

export class CbcReportRowDto {
  @ApiProperty() performanceLevel!: string;
  @ApiProperty() count!: number;
}

export class FeeReportRowDto {
  @ApiProperty() status!: string;
  @ApiProperty() invoiceCount!: number;
  @ApiProperty() billedAmount!: number;
}

export class ReportSummaryDto {
  @ApiPropertyOptional({ type: ReportTermDto, nullable: true })
  term!: ReportTermDto | null;

  @ApiProperty() totalStudents!: number;
  @ApiProperty({ type: [EnrollmentReportRowDto] }) enrollment!: EnrollmentReportRowDto[];

  @ApiProperty() attendanceRecords!: number;
  @ApiProperty() attendanceRate!: number;
  @ApiProperty({ type: [AttendanceReportRowDto] }) attendance!: AttendanceReportRowDto[];

  @ApiProperty() marksRecorded!: number;
  @ApiProperty({ nullable: true, type: Number }) averageScore!: number | null;
  @ApiProperty({ type: [AcademicReportRowDto] }) academics!: AcademicReportRowDto[];
  @ApiProperty({ type: [CbcReportRowDto] }) cbcAssessments!: CbcReportRowDto[];
  @ApiProperty() publishedReportCards!: number;

  @ApiProperty() invoiceCount!: number;
  @ApiProperty() billedAmount!: number;
  @ApiProperty() collectedAmount!: number;
  @ApiProperty() outstandingAmount!: number;
  @ApiProperty({ type: [FeeReportRowDto] }) fees!: FeeReportRowDto[];
}
