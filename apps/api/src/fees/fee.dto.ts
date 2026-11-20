import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FEE_CATEGORIES, INVOICE_STATUSES, PAYMENT_METHODS } from '@school-system/shared';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class FeeStructureQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsString() termId?: string;
}

export class CreateFeeStructureDto {
  @IsString() classId!: string;
  @IsString() termId!: string;
  @IsEnum(FEE_CATEGORIES) category!: (typeof FEE_CATEGORIES)[number];
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
}

export class UpdateFeeStructureDto {
  @IsOptional() @IsEnum(FEE_CATEGORIES) category?: (typeof FEE_CATEGORIES)[number];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
}

export class FeeInvoiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsString() studentId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsString() termId?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsString() classId?: string;
  @ApiPropertyOptional({ enum: INVOICE_STATUSES })
  @IsOptional() @IsEnum(INVOICE_STATUSES) status?: (typeof INVOICE_STATUSES)[number];
}

export class GenerateInvoicesDto {
  @IsString() classId!: string;
  @IsString() termId!: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class RecordPaymentDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
  @IsEnum(PAYMENT_METHODS) method!: (typeof PAYMENT_METHODS)[number];
  @IsOptional() @IsString() mpesaReceiptNumber?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class StkPushDto {
  @IsString() phoneNumber!: string;
  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;
}

export class FeeStatementQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsString() studentId!: string;
  @ApiProperty({ format: 'uuid' })
  @IsString() termId!: string;
}
