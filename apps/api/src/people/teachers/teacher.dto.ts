import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EMPLOYMENT_TYPES,
  normalizeKenyanPhone,
  type EmploymentType,
} from '@school-system/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type {
  TeacherDetailRecord,
  TeacherRecord,
  TeacherSortField,
} from './teacher.types';

const TEACHER_SORT_FIELDS: TeacherSortField[] = [
  'firstName',
  'lastName',
  'tscNumber',
  'createdAt',
];

const phoneTransform = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (normalizeKenyanPhone(value) ?? value) : value;

export class CreateTeacherDto {
  @ApiProperty({ format: 'uuid', description: 'Existing TEACHER login account' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'TSC-2019-001234' })
  @IsString()
  @MaxLength(30)
  tscNumber!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MaxLength(20)
  nationalId!: string;

  @ApiProperty({ example: 'Peter' })
  @IsString()
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ example: 'Mwangi' })
  @IsString()
  @MaxLength(60)
  lastName!: string;

  @ApiProperty({ example: '+254720123458' })
  @Transform(phoneTransform)
  @Matches(/^\+254[17]\d{8}$/, {
    message: 'Phone must be a Kenyan number in the format +2547XXXXXXXX',
  })
  phone!: string;

  @ApiProperty({ example: 'teacher@mwangaza.ac.ke' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: EMPLOYMENT_TYPES })
  @IsIn([...EMPLOYMENT_TYPES])
  employmentType!: EmploymentType;
}

export class UpdateTeacherDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tscNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

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

  @ApiPropertyOptional({ example: '+254720123458' })
  @IsOptional()
  @Transform(phoneTransform)
  @Matches(/^\+254[17]\d{8}$/, {
    message: 'Phone must be a Kenyan number in the format +2547XXXXXXXX',
  })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn([...EMPLOYMENT_TYPES])
  employmentType?: EmploymentType;
}

export class TeacherQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TEACHER_SORT_FIELDS, default: 'lastName' })
  @IsOptional()
  @IsIn(TEACHER_SORT_FIELDS)
  sortBy: TeacherSortField = 'lastName';

  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn([...EMPLOYMENT_TYPES])
  employmentType?: EmploymentType;
}

export class AssignClassSubjectDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subjectId!: string;
}

export class TeacherAssignmentDto {
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiProperty() subjectId!: string;
  @ApiProperty() subjectName!: string;
  @ApiProperty() subjectCode!: string;
}

export class TeacherDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() tscNumber!: string;
  @ApiProperty() nationalId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: EMPLOYMENT_TYPES }) employmentType!: string;
  @ApiProperty() loginEmail!: string;
  @ApiProperty() assignmentCount!: number;
  @ApiProperty() createdAt!: string;
}

export class TeacherDetailDto extends TeacherDto {
  @ApiProperty({ type: [TeacherAssignmentDto] })
  assignments!: TeacherAssignmentDto[];
}


export function toTeacherDto(record: TeacherRecord): TeacherDto {
  return {
    id: record.id,
    userId: record.userId,
    tscNumber: record.tscNumber,
    nationalId: record.nationalId,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: `${record.firstName} ${record.lastName}`,
    phone: record.phone,
    email: record.email,
    employmentType: record.employmentType,
    loginEmail: record.user.email,
    assignmentCount: record._count.classSubjects,
    createdAt: record.createdAt.toISOString(),
  };
}

export function toTeacherDetailDto(record: TeacherDetailRecord): TeacherDetailDto {
  return {
    ...toTeacherDto(record),
    assignments: record.classSubjects.map((assignment) => ({
      classId: assignment.class.id,
      className: assignment.class.name,
      subjectId: assignment.subject.id,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
    })),
  };
}
