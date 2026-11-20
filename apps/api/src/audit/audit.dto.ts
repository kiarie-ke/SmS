import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) actorUserId!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() entityType!: string;
  @ApiPropertyOptional({ nullable: true }) entityId!: string | null;
  @ApiPropertyOptional({ nullable: true }) before!: any;
  @ApiPropertyOptional({ nullable: true }) after!: any;
  @ApiPropertyOptional({ nullable: true }) ip!: string | null;
  @ApiPropertyOptional({ nullable: true }) userAgent!: string | null;
  @ApiProperty() createdAt!: string;
}
