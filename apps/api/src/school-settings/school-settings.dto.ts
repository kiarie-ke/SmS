import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GRADE_SCALE_TYPES,
  KENYAN_PHONE_REGEX,
  SCHOOL_CATEGORIES,
  SCHOOL_LEVELS,
  SCHOOL_TYPES,
} from '@school-system/shared';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SchoolSettingsDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) motto!: string | null;
  @ApiProperty() county!: string;
  @ApiProperty() subCounty!: string;
  @ApiProperty({ enum: SCHOOL_TYPES }) type!: string;
  @ApiProperty({ enum: SCHOOL_CATEGORIES }) category!: string;
  @ApiProperty({ enum: SCHOOL_LEVELS, isArray: true }) levels!: string[];
  @ApiProperty({ enum: GRADE_SCALE_TYPES }) gradeScaleType!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) address!: string | null;
  @ApiProperty() principalName!: string;
  @ApiPropertyOptional({ nullable: true, type: String }) nemisCode!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) knecCenterNumber!: string | null;
}

export class UpdateSchoolSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  motto?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  county?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  subCounty?: string;

  @ApiPropertyOptional({ enum: SCHOOL_TYPES })
  @IsOptional()
  @IsIn(SCHOOL_TYPES)
  type?: (typeof SCHOOL_TYPES)[number];

  @ApiPropertyOptional({ enum: SCHOOL_CATEGORIES })
  @IsOptional()
  @IsIn(SCHOOL_CATEGORIES)
  category?: (typeof SCHOOL_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: SCHOOL_LEVELS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(SCHOOL_LEVELS, { each: true })
  levels?: (typeof SCHOOL_LEVELS)[number][];

  @ApiPropertyOptional({ enum: GRADE_SCALE_TYPES })
  @IsOptional()
  @IsIn(GRADE_SCALE_TYPES)
  gradeScaleType?: (typeof GRADE_SCALE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(KENYAN_PHONE_REGEX, { message: 'Phone must be a Kenyan E.164 number' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  principalName?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  nemisCode?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  knecCenterNumber?: string | null;
}

export class UpdateAcademicPeriodDto {
  @ApiProperty()
  @IsUUID()
  academicYearId!: string;

  @ApiProperty()
  @IsUUID()
  termId!: string;
}
