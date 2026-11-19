import { ApiProperty } from '@nestjs/swagger';
import { ROLES, normalizeKenyanPhone, type Role } from '@school-system/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'clerk@mwangaza.ac.ke' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  @ApiProperty({ example: '+254712345678' })
  @Transform(({ value }) =>
    typeof value === 'string' ? (normalizeKenyanPhone(value) ?? value) : value,
  )
  @Matches(/^\+254[17]\d{8}$/, {
    message: 'Phone must be a Kenyan number in the format +2547XXXXXXXX',
  })
  phone!: string;

  @ApiProperty({ example: 'Str0ngPassw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ enum: ROLES, example: 'TEACHER' })
  @IsIn([...ROLES])
  role!: Role;
}
