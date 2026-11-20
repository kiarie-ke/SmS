import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CLASS_LEVELS } from '@school-system/shared';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { StreamRecord, StreamSortField } from './stream.repository';

const STREAM_SORT_FIELDS: StreamSortField[] = ['name', 'createdAt'];

export class CreateStreamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'Main' })
  @IsString()
  @MaxLength(40)
  name!: string;
}

export class UpdateStreamDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ example: 'Main' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;
}

export class StreamQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: STREAM_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(STREAM_SORT_FIELDS)
  sortBy: StreamSortField = 'name';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class StreamDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() className!: string;
  @ApiProperty({ enum: CLASS_LEVELS }) classLevel!: string;
  @ApiProperty() name!: string;
  @ApiProperty() studentCount!: number;
  @ApiProperty() createdAt!: string;
}

export class StreamListDto {
  @ApiProperty({ type: [StreamDto] }) data!: StreamDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export function toStreamDto(record: StreamRecord): StreamDto {
  return {
    id: record.id,
    classId: record.classId,
    className: record.class.name,
    classLevel: record.class.level,
    name: record.name,
    studentCount: record._count.students,
    createdAt: record.createdAt.toISOString(),
  };
}
