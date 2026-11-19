import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiError } from '../api-response';
import { ERROR_CODE_BY_STATUS, ERROR_CODES } from '../constants';

interface PrismaLikeError {
  name?: string;
  code?: string;
  meta?: unknown;
  message?: string;
}

function isPrismaKnownError(exception: unknown): exception is PrismaLikeError {
  if (typeof exception !== 'object' || exception === null) return false;
  const candidate = exception as PrismaLikeError;
  return (
    candidate.name === 'PrismaClientKnownRequestError' &&
    typeof candidate.code === 'string' &&
    candidate.code.startsWith('P')
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = ERROR_CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;
      } else if (typeof body === 'object' && body !== null) {
        const payload = body as {
          message?: string | string[];
          error?: string;
          code?: string;
          details?: unknown;
        };
        if (payload.code) code = payload.code;
        else code = ERROR_CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;

        if (Array.isArray(payload.message)) {
          code = payload.code ?? ERROR_CODES.VALIDATION_ERROR;
          message = 'Validation failed';
          details = payload.message;
        } else if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (typeof payload.error === 'string') {
          message = payload.error;
        }
        if (payload.details !== undefined && details === undefined) details = payload.details;
      } else {
        code = ERROR_CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;
      }
    } else if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          code = ERROR_CODES.CONFLICT;
          message = 'A record with these details already exists';
          details = exception.meta;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = ERROR_CODES.NOT_FOUND;
          message = 'The requested record was not found';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          code = ERROR_CODES.CONFLICT;
          message = 'This record is still referenced by other data';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          code = ERROR_CODES.INTERNAL_ERROR;
          message = 'Database error';
          this.logger.error(
            `Prisma error ${exception.code} on ${request.method} ${request.originalUrl}`,
            exception.message,
          );
      }
    } else {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `Unhandled error on ${request.method} ${request.originalUrl}: ${errorMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiError = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    if (response.headersSent) return;
    response.status(status).json(body);
  }
}
