import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TERM_NUMBERS } from '@school-system/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { TermRecord, TermSortField } from './term.repository';

const TERM_SORT_FIELDS: TermSortField[] = ['termNumber', 'name', 'startDate'];

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === 1 || value === '1';

export class CreateTermDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ enum: TERM_NUMBERS, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  termNumber!: number;

  @ApiProperty({ example: 'Term 1' })
  @IsString()
  @MaxLength(30)
  name!: string;

  @ApiProperty({ example: '2027-01-04' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-04-09' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateTermDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ enum: TERM_NUMBERS })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  termNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  name?: string;

  @ApiPropertyOptional({ example: '2027-01-04' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-04-09' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class TermQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TERM_SORT_FIELDS, default: 'termNumber' })
  @IsOptional()
  @IsIn(TERM_SORT_FIELDS)
  sortBy: TermSortField = 'termNumber';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isCurrent?: boolean;
}

export class TermDto {
  @ApiProperty() id!: string;
  @ApiProperty() academicYearId!: string;
  @ApiProperty() academicYearName!: string;
  @ApiProperty() termNumber!: number;
  @ApiProperty() name!: string;
  @ApiProperty({ example: '2027-01-04' }) startDate!: string;
  @ApiProperty({ example: '2027-04-09' }) endDate!: string;
  @ApiProperty() isCurrent!: boolean;
}

export class TermListDto {
  @ApiProperty({ type: [TermDto] }) data!: TermDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export function toTermDto(record: TermRecord): TermDto {
  return {
    id: record.id,
    academicYearId: record.academicYearId,
    academicYearName: record.academicYear.name,
    termNumber: record.termNumber,
    name: record.name,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    isCurrent: record.isCurrent,
  };
}
