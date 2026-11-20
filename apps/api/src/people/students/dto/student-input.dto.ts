import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BOARDING_STATUSES,
  GENDERS,
  type BoardingStatus,
  type Gender,
} from '@school-system/shared';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { StudentSortField } from '../student.types';

const STUDENT_SORT_FIELDS: StudentSortField[] = [
  'admissionNumber',
  'firstName',
  'lastName',
  'createdAt',
];

export class CreateStudentDto {
  @ApiProperty({ example: 'ADM-2026-011' })
  @IsString()
  @MaxLength(30)
  admissionNumber!: string;

  @ApiProperty({ example: '200100000011', description: 'NEMIS unique personal identifier' })
  @IsString()
  @MaxLength(30)
  upi!: string;

  @ApiProperty({ example: 'Amina' })
  @IsString()
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ example: 'Wanjiru' })
  @IsString()
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Njoki' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  middleName?: string;

  @ApiProperty({ enum: GENDERS })
  @IsIn([...GENDERS])
  gender!: Gender;

  @ApiProperty({ example: '2013-04-12', description: 'Calendar date (YYYY-MM-DD)' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  birthCertificateNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  knecIndexNumber?: string;

  @ApiProperty({ example: 'Nairobi' })
  @IsString()
  @MaxLength(60)
  county!: string;

  @ApiProperty({ example: 'Westlands' })
  @IsString()
  @MaxLength(60)
  subCounty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  religion?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  specialNeeds?: boolean;

  @ApiPropertyOptional({ enum: BOARDING_STATUSES, default: 'DAY' })
  @IsOptional()
  @IsIn([...BOARDING_STATUSES])
  boardingStatus?: BoardingStatus;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({ description: 'Set by the photo upload endpoint' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'ADM-2026-011' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  admissionNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  upi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  middleName?: string | null;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn([...GENDERS])
  gender?: Gender;

  @ApiPropertyOptional({ example: '2013-04-12' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  birthCertificateNumber?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  knecIndexNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subCounty?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  religion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  specialNeeds?: boolean;

  @ApiPropertyOptional({ enum: BOARDING_STATUSES })
  @IsOptional()
  @IsIn([...BOARDING_STATUSES])
  boardingStatus?: BoardingStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  streamId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsUrl()
  photoUrl?: string | null;
}

export class StudentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STUDENT_SORT_FIELDS, default: 'lastName' })
  @IsOptional()
  @IsIn(STUDENT_SORT_FIELDS)
  sortBy: StudentSortField = 'lastName';

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by class' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by stream' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn([...GENDERS])
  gender?: Gender;
}

export class LinkGuardianDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guardianId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
