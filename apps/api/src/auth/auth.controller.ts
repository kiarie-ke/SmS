import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../common/auth-user';
import { CSRF_COOKIE, REFRESH_COOKIE } from '../common/constants';
import { CsrfProtected } from '../common/decorators/csrf-protected.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import {
  AuthUserDto,
  CsrfInfoResponseDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  MeResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type CookieRequest = Request & { cookies: Record<string, string | undefined> };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('register')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: AuthUserDto })
  @ApiOperation({ summary: 'Create a user account (admin only, no public signup)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiOperation({ summary: 'Authenticate and receive an access token' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto);
    this.cookies.setAuthCookies(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @CsrfProtected()
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiOperation({ summary: 'Rotate the refresh cookie and issue a new access token' })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.refresh(request.cookies?.[REFRESH_COOKIE]);
    this.cookies.setAuthCookies(response, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }

  @Public()
  @CsrfProtected()
  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Revoke the refresh token and clear auth cookies' })
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.cookies?.[REFRESH_COOKIE]);
    this.cookies.clearAuthCookies(response);
    return { message: 'Logged out' };
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiOperation({ summary: 'Change the current user password' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Password changed. Please sign in again.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOkResponse({ type: ForgotPasswordResponseDto })
  @ApiOperation({ summary: 'Request a password reset token (logged in dev)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MeResponseDto })
  @ApiOperation({ summary: 'Return the current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Public()
  @Get('csrf')
  @ApiOkResponse({ type: CsrfInfoResponseDto })
  @ApiOperation({ summary: 'Read the CSRF cookie name used for double-submit checks' })
  csrf() {
    return { cookieName: CSRF_COOKIE, headerName: 'x-csrf-token' };
  }
}
