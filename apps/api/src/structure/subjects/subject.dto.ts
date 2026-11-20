import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SUBJECT_LEVELS, type SubjectLevel } from '@school-system/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { SubjectRecord, SubjectSortField } from './subject.repository';

const SUBJECT_SORT_FIELDS: SubjectSortField[] = ['name', 'code', 'createdAt'];

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === 1 || value === '1';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'MAT' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,15}$/, {
    message: 'Code must be 2-15 letters, digits or dashes',
  })
  code!: string;

  @ApiProperty({ enum: SUBJECT_LEVELS })
  @IsIn([...SUBJECT_LEVELS])
  level!: SubjectLevel;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCbc?: boolean;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ example: 'MAT' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,15}$/, {
    message: 'Code must be 2-15 letters, digits or dashes',
  })
  code?: string;

  @ApiPropertyOptional({ enum: SUBJECT_LEVELS })
  @IsOptional()
  @IsIn([...SUBJECT_LEVELS])
  level?: SubjectLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCbc?: boolean;
}

export class SubjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SUBJECT_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(SUBJECT_SORT_FIELDS)
  sortBy: SubjectSortField = 'name';

  @ApiPropertyOptional({ enum: SUBJECT_LEVELS })
  @IsOptional()
  @IsIn([...SUBJECT_LEVELS])
  level?: SubjectLevel;
}

export class SubjectDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: SUBJECT_LEVELS }) level!: string;
  @ApiProperty() isCbc!: boolean;
  @ApiProperty() classSubjectCount!: number;
  @ApiProperty() createdAt!: string;
}


export function toSubjectDto(record: SubjectRecord): SubjectDto {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    level: record.level,
    isCbc: record.isCbc,
    classSubjectCount: record._count.classSubjects,
    createdAt: record.createdAt.toISOString(),
  };
}
