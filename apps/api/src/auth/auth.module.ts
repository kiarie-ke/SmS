import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthCookieService } from './auth-cookie.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtTokenService } from './jwt-token.service';
import { PasswordService } from './password.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserRepository, UserRepositoryPort } from './user.repository';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCookieService,
    JwtTokenService,
    PasswordService,
    JwtStrategy,
    { provide: UserRepositoryPort, useClass: UserRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
