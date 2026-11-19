import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ROLES } from '@school-system/shared';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'admin@mwangaza.ac.ke' })
  email!: string;

  @ApiProperty({ example: '+254720123457' })
  phone!: string;

  @ApiProperty({ enum: ROLES, example: 'ADMIN' })
  role!: (typeof ROLES)[number];

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true, type: String, example: null })
  lastLoginAt!: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Short-lived bearer token (keep in memory only)' })
  accessToken!: string;

  @ApiProperty({ description: 'Access token lifetime in seconds', example: 900 })
  expiresIn!: number;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class MeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ enum: ROLES })
  role!: (typeof ROLES)[number];
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Logged out' })
  message!: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({
    description: 'Only returned outside production so the reset flow can be tested',
  })
  resetToken?: string;
}

export class CsrfInfoResponseDto {
  @ApiProperty({ example: 'ss_csrf' })
  cookieName!: string;

  @ApiProperty({ example: 'x-csrf-token' })
  headerName!: string;
}
