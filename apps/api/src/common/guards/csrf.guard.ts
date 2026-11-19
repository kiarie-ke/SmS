import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { CSRF_COOKIE, CSRF_HEADER, ERROR_CODES } from '../constants';
import { CSRF_PROTECTED_KEY } from '../decorators/csrf-protected.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(CSRF_PROTECTED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
    const headerToken = request.headers[CSRF_HEADER];
    const header = Array.isArray(headerToken) ? headerToken[0] : headerToken;

    if (!cookieToken || !header || !this.matches(cookieToken, header)) {
      throw new ForbiddenException({
        code: ERROR_CODES.CSRF_TOKEN_INVALID,
        message: 'Invalid or missing CSRF token',
      });
    }
    return true;
  }

  private matches(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
  }
}
