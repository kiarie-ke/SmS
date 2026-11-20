import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ATTENDANCE_STATUSES, type AttendanceStatus as SharedAttendanceStatus } from '@school-system/shared';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import type { AttendanceRecord, ClassSummaryRow, StudentSummaryRow } from './attendance.repository';

export type AttendanceStatus = SharedAttendanceStatus;

export class AttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: ATTENDANCE_STATUSES })
  @IsIn([...ATTENDANCE_STATUSES])
  status!: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  remarks?: string;
}

export class RegisterAttendanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: '2026-05-04', description: 'Calendar date (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class AttendanceQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: '2026-05-04' })
  @IsDateString()
  date!: string;
}

export class StudentAttendanceQueryDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-05-04' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AttendanceDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiPropertyOptional() studentName?: string;
  @ApiPropertyOptional() admissionNumber?: string;
  @ApiProperty() classId!: string;
  @ApiProperty() date!: string;
  @ApiProperty({ enum: ATTENDANCE_STATUSES }) status!: AttendanceStatus;
  @ApiProperty() markedByTeacherId!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) remarks!: string | null;
  @ApiProperty() createdAt!: string;
}

export class ClassSummaryDto {
  @ApiProperty() studentId!: string;
  @ApiProperty() admissionNumber!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() present!: number;
  @ApiProperty() absent!: number;
  @ApiProperty() late!: number;
  @ApiProperty() excused!: number;
  @ApiProperty() total!: number;
}

export class StudentSummaryDto {
  @ApiProperty() present!: number;
  @ApiProperty() absent!: number;
  @ApiProperty() late!: number;
  @ApiProperty() excused!: number;
  @ApiProperty() total!: number;
  @ApiProperty() percentage!: number;
}

export function toAttendanceDto(record: AttendanceRecord): AttendanceDto {
  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.student
      ? `${record.student.firstName} ${record.student.lastName}`
      : undefined,
    admissionNumber: record.student?.admissionNumber,
    classId: record.classId,
    date: record.date.toISOString().slice(0, 10),
    status: record.status,
    markedByTeacherId: record.markedByTeacherId,
    remarks: record.remarks,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toClassSummaryDto(row: ClassSummaryRow): ClassSummaryDto {
  return {
    studentId: row.studentId,
    admissionNumber: row.admissionNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    present: row.present,
    absent: row.absent,
    late: row.late,
    excused: row.excused,
    total: row.total,
  };
}

export function toStudentSummaryDto(row: StudentSummaryRow): StudentSummaryDto {
  return {
    present: row.present,
    absent: row.absent,
    late: row.late,
    excused: row.excused,
    total: row.total,
    percentage: row.percentage,
  };
}
