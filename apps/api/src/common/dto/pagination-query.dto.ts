import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Shared list query: page, limit, free-text search and sort direction.
 * Entity query DTOs extend this to add filters and a whitelisted `sortBy`.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Case-insensitive search term', maxLength: 100 })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'asc';

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
