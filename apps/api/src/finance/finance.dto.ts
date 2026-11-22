import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FINANCE_TRANSACTION_TYPES,
  type FinanceTransactionType,
} from '@school-system/shared';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreateFinanceTransactionDto {
  @ApiProperty({ enum: FINANCE_TRANSACTION_TYPES })
  @IsIn([...FINANCE_TRANSACTION_TYPES])
  type!: FinanceTransactionType;

  @ApiProperty({ example: 'Utilities' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @ApiProperty({ example: 'Water bill for Term 2' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({ minimum: 0.01, maximum: 999999999, example: 12500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999)
  amount!: number;

  @ApiPropertyOptional({ example: 'INV-2026-0042' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: '2026-05-22', description: 'Calendar date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class FinanceTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FINANCE_TRANSACTION_TYPES })
  @IsOptional()
  @IsIn([...FINANCE_TRANSACTION_TYPES])
  type?: FinanceTransactionType;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class FinanceSummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
