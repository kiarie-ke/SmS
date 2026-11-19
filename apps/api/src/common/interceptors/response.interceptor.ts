import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { ApiSuccess, PaginatedResult } from '../api-response';

function isEnvelope(value: unknown): value is ApiSuccess<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

function isPaginated(value: unknown): value is PaginatedResult<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { data?: unknown; meta?: unknown };
  return (
    Array.isArray(candidate.data) &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null
  );
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (isEnvelope(payload)) return payload;
        if (isPaginated(payload)) {
          return { success: true, data: payload.data, meta: payload.meta };
        }
        return { success: true, data: payload };
      }),
    );
  }
}
