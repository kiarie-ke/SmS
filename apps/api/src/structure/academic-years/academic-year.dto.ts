import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type {
  AcademicYearRecord,
  AcademicYearSortField,
} from './academic-year.repository';

const YEAR_SORT_FIELDS: AcademicYearSortField[] = ['name', 'startDate', 'createdAt'];

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === 1 || value === '1';

export class CreateAcademicYearDto {
  @ApiProperty({ example: '2027' })
  @IsString()
  @MaxLength(20)
  name!: string;

  @ApiProperty({ example: '2027-01-04' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-10-29' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateAcademicYearDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ example: '2027-01-04' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-10-29' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class AcademicYearQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: YEAR_SORT_FIELDS, default: 'startDate' })
  @IsOptional()
  @IsIn(YEAR_SORT_FIELDS)
  sortBy: AcademicYearSortField = 'startDate';

  @ApiPropertyOptional({ description: 'Filter by the current academic year' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class AcademicYearDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ example: '2027-01-04' }) startDate!: string;
  @ApiProperty({ example: '2027-10-29' }) endDate!: string;
  @ApiProperty() isCurrent!: boolean;
  @ApiProperty() termCount!: number;
  @ApiProperty() classCount!: number;
}


export function toAcademicYearDto(record: AcademicYearRecord): AcademicYearDto {
  return {
    id: record.id,
    name: record.name,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    isCurrent: record.isCurrent,
    termCount: record._count.terms,
    classCount: record._count.classes,
  };
}
