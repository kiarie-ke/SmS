import { ApiProperty } from '@nestjs/swagger';
import {
  FINANCE_TRANSACTION_TYPES,
  type FinanceTransactionType,
} from '@school-system/shared';

export class FinanceRecorderDto {
  @ApiProperty() email!: string;
}

export class FinanceTransactionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: FINANCE_TRANSACTION_TYPES }) type!: FinanceTransactionType;
  @ApiProperty() category!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ type: Number }) amount!: number;
  @ApiProperty({ nullable: true, type: String }) reference!: string | null;
  @ApiProperty({ type: String, format: 'date' }) occurredAt!: string;
  @ApiProperty({ format: 'uuid' }) recordedByUserId!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: FinanceRecorderDto }) recordedBy!: FinanceRecorderDto;
}

export class FinanceSummaryDto {
  @ApiProperty({ type: Number }) income!: number;
  @ApiProperty({ type: Number }) expenses!: number;
  @ApiProperty({ type: Number }) balance!: number;
  @ApiProperty({ example: 'KES' }) currency!: 'KES';
}
