import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) actorUserId!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) entityId!: string | null;
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true }) before!: Record<string, unknown> | unknown[] | null;
  @ApiPropertyOptional({ nullable: true, type: 'object', additionalProperties: true }) after!: Record<string, unknown> | unknown[] | null;
  @ApiPropertyOptional({ nullable: true, type: String }) ip!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) userAgent!: string | null;
  @ApiProperty() createdAt!: string;
}
