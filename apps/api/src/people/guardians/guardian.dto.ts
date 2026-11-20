import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RELATIONSHIPS, normalizeKenyanPhone, type Relationship } from '@school-system/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { GuardianRecord, GuardianSortField } from './guardian.types';

const GUARDIAN_SORT_FIELDS: GuardianSortField[] = ['firstName', 'lastName', 'createdAt'];

const phoneTransform = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (normalizeKenyanPhone(value) ?? value) : value;

export class CreateGuardianDto {
  @ApiProperty({ example: 'Joseph' })
  @IsString()
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ example: 'Otieno' })
  @IsString()
  @MaxLength(60)
  lastName!: string;

  @ApiProperty({ example: '+254711000010' })
  @Transform(phoneTransform)
  @Matches(/^\+254[17]\d{8}$/, {
    message: 'Phone must be a Kenyan number in the format +2547XXXXXXXX',
  })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiProperty({ enum: RELATIONSHIPS })
  @IsIn([...RELATIONSHIPS])
  relationship!: Relationship;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Optional parent login account' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class UpdateGuardianDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional({ example: '+254711000010' })
  @IsOptional()
  @Transform(phoneTransform)
  @Matches(/^\+254[17]\d{8}$/, {
    message: 'Phone must be a Kenyan number in the format +2547XXXXXXXX',
  })
  phone?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string | null;

  @ApiPropertyOptional({ enum: RELATIONSHIPS })
  @IsOptional()
  @IsIn([...RELATIONSHIPS])
  relationship?: Relationship;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupation?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}

export class GuardianQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: GUARDIAN_SORT_FIELDS, default: 'lastName' })
  @IsOptional()
  @IsIn(GUARDIAN_SORT_FIELDS)
  sortBy: GuardianSortField = 'lastName';

  @ApiPropertyOptional({ enum: RELATIONSHIPS })
  @IsOptional()
  @IsIn([...RELATIONSHIPS])
  relationship?: Relationship;
}

export class GuardianDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) nationalId!: string | null;
  @ApiProperty({ enum: RELATIONSHIPS }) relationship!: string;
  @ApiProperty({ nullable: true, type: String }) occupation!: string | null;
  @ApiProperty({ nullable: true, type: String }) address!: string | null;
  @ApiProperty({ nullable: true, type: String }) userId!: string | null;
  @ApiProperty() studentCount!: number;
  @ApiProperty() createdAt!: string;
}

export class GuardianListDto {
  @ApiProperty({ type: [GuardianDto] }) data!: GuardianDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}

export function toGuardianDto(record: GuardianRecord): GuardianDto {
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    fullName: `${record.firstName} ${record.lastName}`,
    phone: record.phone,
    email: record.email,
    nationalId: record.nationalId,
    relationship: record.relationship,
    occupation: record.occupation,
    address: record.address,
    userId: record.userId,
    studentCount: record._count.students,
    createdAt: record.createdAt.toISOString(),
  };
}
