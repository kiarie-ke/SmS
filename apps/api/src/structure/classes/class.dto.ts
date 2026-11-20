import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CLASS_LEVELS, type ClassLevel } from '@school-system/shared';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { ClassRecord, ClassSortField } from './class.repository';

const CLASS_SORT_FIELDS: ClassSortField[] = ['name', 'level', 'createdAt'];

export class CreateClassDto {
  @ApiProperty({ enum: CLASS_LEVELS, example: 'G7' })
  @IsIn([...CLASS_LEVELS])
  level!: ClassLevel;

  @ApiProperty({ example: 'Grade 7 West' })
  @IsString()
  @MaxLength(60)
  name!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  classTeacherId?: string | null;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ enum: CLASS_LEVELS })
  @IsOptional()
  @IsIn([...CLASS_LEVELS])
  level?: ClassLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  classTeacherId?: string | null;
}

export class ClassQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CLASS_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(CLASS_SORT_FIELDS)
  sortBy: ClassSortField = 'name';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ enum: CLASS_LEVELS })
  @IsOptional()
  @IsIn([...CLASS_LEVELS])
  level?: ClassLevel;
}

export class ClassDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CLASS_LEVELS }) level!: string;
  @ApiProperty() name!: string;
  @ApiProperty() academicYearId!: string;
  @ApiProperty() academicYearName!: string;
  @ApiProperty({ nullable: true, type: String }) classTeacherId!: string | null;
  @ApiProperty({ nullable: true, type: String }) classTeacherName!: string | null;
  @ApiProperty() studentCount!: number;
  @ApiProperty() streamCount!: number;
  @ApiProperty() subjectCount!: number;
  @ApiProperty() createdAt!: string;
}


export function toClassDto(record: ClassRecord): ClassDto {
  return {
    id: record.id,
    level: record.level,
    name: record.name,
    academicYearId: record.academicYearId,
    academicYearName: record.academicYear.name,
    classTeacherId: record.classTeacherId,
    classTeacherName: record.classTeacher
      ? `${record.classTeacher.firstName} ${record.classTeacher.lastName}`
      : null,
    studentCount: record._count.students,
    streamCount: record._count.streams,
    subjectCount: record._count.classSubjects,
    createdAt: record.createdAt.toISOString(),
  };
}
